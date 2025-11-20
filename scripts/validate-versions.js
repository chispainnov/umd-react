#!/usr/bin/env node

/**
 * Validation script to ensure version consistency across:
 * - package.json version
 * - package.json devDependencies
 * - built dist files
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function validateVersions() {
  console.log('🔍 Validating version consistency...\n');
  
  const errors = [];
  const warnings = [];
  
  // 1. Read package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const packageVersion = pkg.version;
  const reactDevDep = pkg.devDependencies.react.replace(/^[\^~>=<]/, '');
  const reactDomDevDep = pkg.devDependencies['react-dom'].replace(/^[\^~>=<]/, '');
  
  console.log(`📦 package.json version: ${packageVersion}`);
  console.log(`📦 devDependencies.react: ${reactDevDep}`);
  console.log(`📦 devDependencies.react-dom: ${reactDomDevDep}\n`);
  
  // 2. Check devDependencies match package version
  if (reactDevDep !== packageVersion) {
    errors.push(`❌ devDependencies.react (${reactDevDep}) doesn't match package version (${packageVersion})`);
  } else {
    console.log('✅ devDependencies.react matches package version');
  }
  
  if (reactDomDevDep !== packageVersion) {
    errors.push(`❌ devDependencies.react-dom (${reactDomDevDep}) doesn't match package version (${packageVersion})`);
  } else {
    console.log('✅ devDependencies.react-dom matches package version');
  }
  
  // 3. Check installed node_modules (if exists)
  const nodeModulesReactPath = path.join(rootDir, 'node_modules', 'react', 'package.json');
  if (existsSync(nodeModulesReactPath)) {
    const installedReact = JSON.parse(readFileSync(nodeModulesReactPath, 'utf8'));
    const installedVersion = installedReact.version;
    
    console.log(`\n📦 node_modules/react version: ${installedVersion}`);
    
    if (installedVersion !== reactDevDep) {
      errors.push(`❌ Installed React (${installedVersion}) doesn't match devDependencies (${reactDevDep})`);
      errors.push(`   💡 Run: npm install`);
    } else {
      console.log('✅ Installed React matches devDependencies');
    }
  }
  
  // 4. Check dist files (if exist)
  const distFiles = [
    'dist/react.production.min.js',
    'dist/react.development.js',
    'dist/react-dom.production.min.js',
    'dist/react-dom.development.js'
  ];
  
  console.log('\n📦 Checking built dist files...');
  
  let distFilesChecked = 0;
  for (const distFile of distFiles) {
    const distPath = path.join(rootDir, distFile);
    if (existsSync(distPath)) {
      const content = readFileSync(distPath, 'utf8');
      const firstLine = content.split('\n')[0];
      
      // Extract version from comment like: /*! react.production.min.js v19.2.0 */
      const versionMatch = firstLine.match(/v(\d+\.\d+\.\d+)/);
      
      if (versionMatch) {
        const embeddedVersion = versionMatch[1];
        console.log(`   ${distFile}: v${embeddedVersion}`);
        
        if (embeddedVersion !== packageVersion) {
          errors.push(`❌ ${distFile} has v${embeddedVersion}, expected v${packageVersion}`);
          errors.push(`   💡 Run: npm run build`);
        }
        distFilesChecked++;
      } else {
        warnings.push(`⚠️  Could not extract version from ${distFile}`);
      }
    }
  }
  
  if (distFilesChecked === distFiles.length) {
    console.log('✅ All dist files have correct versions');
  } else if (distFilesChecked === 0) {
    warnings.push('⚠️  No dist files found - run "npm run build" first');
  }
  
  // 5. Report results
  console.log('\n' + '='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n❌ VALIDATION FAILED:\n');
    errors.forEach(err => console.log(err));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    warnings.forEach(warn => console.log(warn));
  }
  
  console.log('\n✅ All version validations passed!\n');
  process.exit(0);
}

validateVersions();


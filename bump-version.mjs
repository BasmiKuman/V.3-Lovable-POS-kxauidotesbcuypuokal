#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packagePath = join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

// Parse current version
const [major, minor, patch] = packageJson.version.split('.').map(Number);

// Increment patch version
const newPatch = patch + 1;
const newVersion = `${major}.${minor}.${newPatch}`;

// Update package.json
packageJson.version = newVersion;
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version bumped: ${major}.${minor}.${patch} → ${newVersion}`);

// Update Android versionCode and versionName
const buildGradlePath = join(__dirname, 'android/app/build.gradle');
let buildGradle = readFileSync(buildGradlePath, 'utf8');

// Calculate versionCode (MAJOR * 10000 + MINOR * 100 + PATCH)
const versionCode = major * 10000 + minor * 100 + newPatch;

// Update versionCode
buildGradle = buildGradle.replace(
  /versionCode \d+/,
  `versionCode ${versionCode}`
);

// Update versionName
buildGradle = buildGradle.replace(
  /versionName "[\d.]+"/,
  `versionName "${newVersion}"`
);

writeFileSync(buildGradlePath, buildGradle);

console.log(`✅ Android version updated:`);
console.log(`   - versionCode: ${versionCode}`);
console.log(`   - versionName: ${newVersion}`);

// Update capacitor.config.ts with version info
const capacitorConfigPath = join(__dirname, 'capacitor.config.ts');
let capacitorConfig = readFileSync(capacitorConfigPath, 'utf8');

// Add version comment if not exists
if (!capacitorConfig.includes('// Version:')) {
  capacitorConfig = capacitorConfig.replace(
    /const config: CapacitorConfig = {/,
    `// Version: ${newVersion}\nconst config: CapacitorConfig = {`
  );
} else {
  capacitorConfig = capacitorConfig.replace(
    /\/\/ Version: [\d.]+/,
    `// Version: ${newVersion}`
  );
}

writeFileSync(capacitorConfigPath, capacitorConfig);

console.log(`✅ Capacitor config updated with version: ${newVersion}`);
console.log(`\n🎉 Ready to build v${newVersion}!`);

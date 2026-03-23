#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceSkillsDir = resolve(__dirname, '..', '.agents', 'skills');
const targetDir = resolve(process.cwd(), '.agents', 'skills');

if (!existsSync(sourceSkillsDir)) {
  console.error('Cortivex skills not found. Ensure the package is installed correctly.');
  process.exit(1);
}

const skills = readdirSync(sourceSkillsDir).filter(f => f.startsWith('cortivex-'));

if (skills.length === 0) {
  console.error('No skills found in package.');
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

let installed = 0;
let skipped = 0;

for (const skill of skills) {
  const targetSkillDir = join(targetDir, skill);
  if (existsSync(targetSkillDir)) {
    skipped++;
    continue;
  }
  cpSync(join(sourceSkillsDir, skill), targetSkillDir, { recursive: true });
  installed++;
}

console.log(`Cortivex skills installed: ${installed} new, ${skipped} already present.`);
console.log(`Location: ${targetDir}`);
console.log('');
console.log('Available skills:');
for (const skill of skills) {
  console.log(`  - ${skill}`);
}
console.log('');
console.log('Run "cortivex list --templates" to see available pipeline templates.');

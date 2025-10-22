import { globby } from 'globby';
import { dirname, resolve } from 'path';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const incomingArgs = process.argv.slice(2);
if (incomingArgs.length !== 2) {
    console.error('Usage: node generic-npm-install.mjs <srcDir> <outputJsonFile>');
    process.exit(1);
}

const [srcDir, outputFile] = incomingArgs;
const packageJsonPaths = await globby([
    '**/package.json',
    '!**/node_modules/**',
    '!**/bin/Debug/**',
    '!**/bin/Release/**'
], { cwd: srcDir });

for (const jsonPath of packageJsonPaths) {
    const packageDir = resolve(srcDir, dirname(jsonPath));
    console.log(`📦 Found package.json in: ${packageDir}`);
    try {
        execSync('npm install', { cwd: packageDir, stdio: 'inherit' });
    } catch (installErr) {
        console.error(`❌ npm install also failed in ${packageDir}`);
        console.error(installErr.message);
    }
}

const fullPaths = packageJsonPaths.map(p => resolve(srcDir, p));
writeFileSync(outputFile, JSON.stringify(fullPaths, null, 2));
console.log(`✅ Saved ${fullPaths.length} package.json paths to ${outputFile}`);
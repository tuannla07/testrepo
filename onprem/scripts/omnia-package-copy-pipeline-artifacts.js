const fs = require("fs-extra");
const path = require("path");

const incomingArgs = process.argv.slice(2);
if (incomingArgs.length !== 2) {
  console.error('Please provide at least Omnia CLI directory and SRC directory.');
  process.exit(1);
}

const [srcFolder, destDir] = incomingArgs;

const currentPath = process.cwd();

const folders = fs.readdirSync(currentPath)
  .filter(name => fs.statSync(path.join(currentPath, name)).isDirectory());

console.log('Folders in current path:');
console.log(folders);

/////////////////////////////////////////////////////////////////////////////////////

const destPackageFolders = destDir + "/packages";

if (!fs.existsSync(destPackageFolders)) {
    fs.mkdirSync(destPackageFolders, { recursive: true});
}

console.log('Current working dir:', process.cwd());
console.log('Script dir:', __dirname);
console.log('Resolved template path:', path.resolve(__dirname, '../package-templates'));

// copy package template to destination packages folder
const templateFolder = path.resolve(__dirname, '../package-templates');

fs.copySync(templateFolder, destDir, {overwrite: true, recursive: true});
console.log(`Copied artifacts from ${srcFolder} to ${destPackageFolders}`);

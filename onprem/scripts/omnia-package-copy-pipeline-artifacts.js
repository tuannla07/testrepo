const fs = require("fs-extra");
const path = require("path");

const currentPath = process.cwd();

const folders = fs.readdirSync(currentPath)
  .filter(name => fs.statSync(path.join(currentPath, name)).isDirectory());

console.log('Folders in current path:');
console.log(folders);

/////////////////////////////////////////////////////////////////////////////////////


const srcFolder = $(Build.SourcesDirectory);
const destDir = $(System.ArtifactsDirectory);
const destPackageFolders = destDir + "/packages";

if (!fs.existsSync(destPackageFolders)) {
    fs.mkdirSync(destPackageFolders, { recursive: true});
}

// copy package template to destination packages folder
const templateFolder = "../package-templates";

fs.copySync(templateFolder, destDir, {overwrite: true, recursive: true});
console.log(`Copied artifacts from ${srcFolder} to ${packageFolders}`);

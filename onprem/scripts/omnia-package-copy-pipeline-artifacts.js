const fs = require("fs-extra");
const path = require("path");

const incomingArgs = process.argv.slice(2);
if (incomingArgs.length < 3) {
  console.error('Please provide: artifacts directory, src directory and comma-separated package names.');
  process.exit(1);
}

const srcFolder = "" //$(Build.SourcesDirectory);
const destDir = "C:\\tmp"; //$(System.ArtifactsDirectory);
const destPackageFolders = destinationFolder + "/packages";

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(packageFolders, { recursive: true});
}

// copy package template to destination packages folder
const templateFolder = "../package-templates";

fs.copySync(templateFolder, destDir, {overwrite: true, recursive: true});
console.log(`Copied artifacts from ${srcFolder} to ${packageFolders}`);

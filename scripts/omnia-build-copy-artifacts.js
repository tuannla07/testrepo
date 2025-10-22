const fs = require("fs-extra");
const path = require("path");

const incomingArgs = process.argv.slice(2);
if (incomingArgs.length < 3) {
  console.error('Please provide: artifacts directory, src directory and comma-separated package names.');
  process.exit(1);
}
const [srcFolder, destinationFolder, packageNamesString] = incomingArgs;

const packageNames = packageNamesString.split(",").map(pkg => pkg.trim());

if (packageNames.length == 0) {
  console.error('Please provide at least one package name.');
  process.exit(1);
}

// Run copy from src to artifacts folder
packageNames.forEach((pkg) => {
  let pkgName = pkg;

  let srcPackageName = pkg;
  if (pkg.startsWith('omnia-')) {
    pkgName = pkg.substring(6);
  }

  if (pkg === 'ms') {
    srcPackageName = pkgName = 'management-system';
  }

  const srcPath = path.join(srcFolder, pkg);
  const destPath = path.join(destinationFolder, pkgName);

  console.log("\x1b[90m%s\x1b[0m", `Start folder ${srcPath}...`);

  if (!fs.existsSync(srcPath)) {
    console.error(`Source path ${srcPath} does not exist.`);
    return;
  }

  console.log("\x1b[90m%s\x1b[0m", `Deleting existing folder ${destPath}...`);
  fs.removeSync(destPath);

  console.log(`Copying ${srcPath} to ${destPath}...`);
  fs.copySync(srcPath, destPath);
});

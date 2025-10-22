const fs = require("fs-extra");
const path = require("path");

console.log("\x1b[33m%s\x1b[0m", "Copying NPM packages");

const incomingArgs = process.argv.slice(2);
if (incomingArgs.length < 3) {
  console.error('Please provide: Extension src path, artifacts path and name [omnia, wp, wcm, ms].');
  process.exit(1);
}

const [srcFolder, destinationFolder, packageName] = incomingArgs;
const srcDir = srcFolder + "/wwwroot/packages";
const destDir = destinationFolder + "/node_modules/@omnia";

// Create the destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

switch (packageName) {
  case "omnia":
    copyOmniaPackages();
    break;
  case "wp":
    copyWpPackages();
    break;
  case "wcm":
    copyWcmPackages();
    break;
  case "ms":
    copyMsPackages();
    break;
  default:
    console.error('Please provide a valid package name [omnia, wp, wcm, ms].');
    process.exit(1);
}

function copyOmniaPackages() {
  const packages = [
    "fx",
    "fx-models",
    "fx-msteams",
    "fx-sp",
    "fx-spfx",
    "tooling",
    "tooling-composers",
    "fx-sp-models",
    "runtime",
    "types",
    "velcron",
    "mobile"
  ];
  copyFiles(packages, true);
}

function copyWpPackages() {
  const packages = [
    "workplace"
  ];
  copyFiles(packages);
}

function copyWcmPackages() {
  const packages = [
    "wcm"
  ];
  copyFiles(packages);
}

function copyMsPackages() {
  const packages = [
    "ms"
  ];
  copyFiles(packages);
}

function copyFiles(packages, includeOmnia = false) {
  packages.forEach((pkg) => {
    const srcPath = path.join(srcDir, includeOmnia ? `omnia-${pkg}` : pkg);
    const destPath = path.join(destDir, `${pkg}`);

    console.log("\x1b[90m%s\x1b[0m", `Deleting existing folder ${destPath}...`);
    fs.removeSync(destPath);

    console.log(`Copying ${srcPath} to ${destPath}...`);
    fs.copySync(srcPath, destPath);
  });
}

// Define the packages to copy


console.log("\x1b[33m%s\x1b[0m", "All packages copied successfully.");

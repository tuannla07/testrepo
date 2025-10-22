const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec); // Promisify exec for better error handling

const incomingArgs = process.argv.slice(2);
if (incomingArgs.length !== 2) {
  console.error('Please provide at least Omnia CLI directory and SRC directory.');
  process.exit(1);
}

const [omniaCliDir, srcDir] = incomingArgs;


// List of directories containing exension.json
const directories = [
  srcDir + '/omnia',
  srcDir + '/workplace',
  srcDir + '/webcontentmanagement',
  srcDir + '/managementsystem',
  srcDir + '/contentmanagement'
];


// Run npm install in parallel
(async () => {
  try {
    const omniaCmd = omniaCliDir == "." ? "omnia" : `${omniaCliDir}/omnia`;
    const restorePromises = directories.map((dir) => {
      console.log("\x1b[90m%s\x1b[0m", `Starting omnia dev restore in: ${dir}`);
      return execPromise(`${omniaCmd} dev restore -p ${dir}`, { cwd: dir })
        .then(() => {
          console.log("\x1b[32m%s\x1b[0m", `Restore completed successfully for: ${dir}`);
        })
        .catch((error) => {
          console.error("\x1b[31m%s\x1b[0m", `Error in restore process for ${dir}: ${error.message}`);
          throw error; // Propagate the error to stop all processes
        });
    });

    await Promise.all(restorePromises); // Wait for all restore processes to complete
    console.log("\x1b[90m%s\x1b[0m", 'All restore processes completed successfully.');
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", 'One or more restore processes failed.');
    process.exit(1); // Exit the script if any process fails
  }
})();
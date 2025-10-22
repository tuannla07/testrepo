import { globby } from 'globby';
import fs from 'fs/promises';

async function main() {
  const incomingArgs = process.argv.slice(2);
  if (incomingArgs.length !== 1) {
    console.error('Please provide the SRC directory.');
    process.exit(1);
  }

  const srcDir = incomingArgs[0];
  const packageJsonPaths = await globby([
    '**/package.json',
    '!**/node_modules/**',
    '!**/bin/Debug/**',
    '!**/bin/Release/**'
  ]);

  console.log(`Found ${packageJsonPaths.length} package.json files from source directory:`);

  // Cache package info to avoid multiple fetches for the same package
  const packageInfoCache = new Map();

  // Map pkgName -> Set of used versions
  const packageUsageVersions = new Map();

  // Store per package.json entries for building rows grouped by package.json file
  const packageJsonEntries = new Map();

  for (const jsonPath of packageJsonPaths) {
    console.log("Found package.json file:" + jsonPath);

    const content = await fs.readFile(jsonPath, 'utf8');
    const pkg = JSON.parse(content);

    const allDeps = {
      dependency: pkg.dependencies || {},
      dev: pkg.devDependencies || {},
    };

    console.log(`Found ${Object.keys(allDeps.dependency).length} regular dependencies`);
    console.log(`Found ${Object.keys(allDeps.dev).length} dev dependencies`);

    const entries = [];

    for (const [depType, deps] of Object.entries(allDeps)) {
      for (const [pkgName, version] of Object.entries(deps)) {
        // Track usage versions
        if (!packageUsageVersions.has(pkgName)) {
          packageUsageVersions.set(pkgName, new Set());
        }
        packageUsageVersions.get(pkgName).add(version);

        // Check cache first
        if (!packageInfoCache.has(pkgName)) {
          try {
            const res = await fetch(`https://registry.npmjs.org/${pkgName}`);
            const data = await res.json();

            const latest = data['dist-tags']?.latest || 'unknown';
            const deprecated = data.versions?.[latest]?.deprecated || '';

            packageInfoCache.set(pkgName, {
              latest,
              deprecated: !!deprecated
            });
          } catch (err) {
            // On error, store error info to avoid retrying multiple times
            packageInfoCache.set(pkgName, {
              latest: 'error',
              deprecated: false
            });
          }
        }

        const pkgInfo = packageInfoCache.get(pkgName);

        // Determine status by comparing each usage version with latest
        let status = '✅ Up-to-date';
        if (pkgInfo.deprecated) {
          status = '🔴 Deprecated';
        } else if (!pkgInfo.deprecated && pkgInfo.latest !== 'error' && version !== pkgInfo.latest) {
          status = '⚠️ Outdated';
        }

        entries.push({
          type: depType,
          name: pkgName,
          version,
          latest: pkgInfo.latest,
          status,
          deprecated: pkgInfo.deprecated
        });
      }
    }

    packageJsonEntries.set(jsonPath, entries);
  }

  // Build summary
  const totalPackages = packageInfoCache.size;

  // For outdated count, check if any version used is different from latest and not deprecated
  let outdatedCount = 0;
  for (const [pkgName, info] of packageInfoCache.entries()) {
    if (info.deprecated) continue;
    const usedVersions = packageUsageVersions.get(pkgName);
    if (!usedVersions) continue;
    // If any used version differs from latest, count as outdated
    for (const usedVersion of usedVersions) {
      if (usedVersion !== info.latest) {
        outdatedCount++;
        break;
      }
    }
  }

  let deprecatedCount = 0;
  for (const [pkgName, info] of packageInfoCache.entries()) {
    if (info.deprecated) deprecatedCount++;
  }

  // Build HTML

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NPM Dependency Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr.deprecated td { background-color: #ffe6e6; }
    td.path { font-weight: bold; background-color: #ddd; text-align: center; }
    .summary { margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>NPM Dependency Report</h1>

  <div class="summary">
    <p><strong>Total Unique Packages:</strong> ${totalPackages}</p>
    <p><strong>Outdated Packages:</strong> ${outdatedCount}</p>
    <p><strong>Deprecated Packages:</strong> ${deprecatedCount}</p>
  </div>

  <table>
    <tr>
      <th>Dependency Type</th>
      <th>Package</th>
      <th>Current</th>
      <th>Latest</th>
      <th>Status</th>
    </tr>
`;

  for (const [jsonPath, entries] of packageJsonEntries.entries()) {
    if (entries.length > 0) {
      html += `<tr><td colspan="5" class="path">${jsonPath}</td></tr>`;
      for (const entry of entries) {
        html += `
      <tr class="${entry.deprecated ? 'deprecated' : ''}">
        <td>${entry.type}</td>
        <td>${entry.name} ${entry.deprecated ? '(DEPRECATED)' : ''}</td>
        <td>${entry.version}</td>
        <td>${entry.latest}</td>
        <td>${entry.status}</td>
      </tr>
      `;
      }
    }
  }

  html += `
  </table>
</body>
</html>
`;

  await fs.writeFile(srcDir + '/npm-dependency-report.html', html, 'utf8');
  console.log('✅ HTML report saved as npm-dependency-report.html');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

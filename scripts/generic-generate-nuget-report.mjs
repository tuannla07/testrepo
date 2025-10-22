import fs from 'fs/promises';
import path from 'path';
import { parseStringPromise } from 'xml2js';

async function main() {

  const incomingArgs = process.argv.slice(2);
  if (incomingArgs.length !== 2) {
    console.error('Usage: node omnia-generate-nuget-report.mjs <srcDir> <slnFilename>');
    process.exit(1);
  }

  const [srcDir, slnFilename] = incomingArgs;
  const slnContent = await fs.readFile(slnFilename, 'utf8');

  // Match lines like: Project(...) = "Name", "path/to/project.csproj", "{GUID}"
  const csprojPaths = [...slnContent.matchAll(/"([^"]+\.csproj)"/g)]
    .map(match => path.resolve(path.dirname(slnFilename), match[1]));

  console.log(`Found ${csprojPaths.length} .csproj files from solution:`);

  // Cache package info to avoid fetching multiple times per package
  const packageInfoCache = new Map();

  // Map packageName -> Set of used versions
  const packageUsageVersions = new Map();

  // Store entries grouped by csproj path
  const csprojEntries = new Map();

  for (const csprojPath of csprojPaths) {
    let fixedPath = csprojPath.replace(/\\/g, '/'); // Normalize for Windows paths
    fixedPath = path.normalize(fixedPath);

    console.log("Found csproj file: " + fixedPath);
    const content = await fs.readFile(fixedPath, 'utf8');

    const xml = await parseStringPromise(content);
    const itemGroups = xml.Project.ItemGroup || [];
    const packages = [];

    for (const group of itemGroups) {
      const refs = group.PackageReference || [];
      for (const ref of refs) {
        const name = ref.$.Include;
        const version = ref.$.Version || (ref.Version ? ref.Version[0] : 'unknown');
        packages.push({ name, version });

        // Track usage versions
        if (!packageUsageVersions.has(name)) {
          packageUsageVersions.set(name, new Set());
        }
        packageUsageVersions.get(name).add(version);
      }
    }

    const entries = [];

    for (const pkg of packages) {
      if (!packageInfoCache.has(pkg.name)) {
        try {
          const res = await fetch(`https://api.nuget.org/v3/registration5-semver1/${pkg.name.toLowerCase()}/index.json`);
          if (res.ok) {
            const data = await res.json();
            const versions = data.items || [];
            const latestEntry = versions[versions.length - 1];

            // Some NuGet registrations have nested pages of versions
            // To get the highest version, let's find max version from all entries:
            let latestVersion = 'unknown';
            if (versions.length) {
              // Collect all upper bounds (version ranges)
              const allVersions = [];
              for (const page of versions) {
                if (page.items) {
                  for (const item of page.items) {
                    allVersions.push(item.catalogEntry.version);
                  }
                }
              }
              // Find the max semver version from allVersions
              latestVersion = allVersions.sort((a, b) => {
                // Simple semver compare - split by dots and compare parts numerically
                const pa = a.split('.').map(n => parseInt(n));
                const pb = b.split('.').map(n => parseInt(n));
                for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                  const na = pa[i] || 0;
                  const nb = pb[i] || 0;
                  if (na > nb) return -1;
                  if (nb > na) return 1;
                }
                return 0;
              })[0];
            }

            if (!latestVersion) {
              latestVersion = latestEntry?.upper || 'unknown';
            }

            // Deprecated detection: NuGet doesn't have a consistent deprecated flag in the API,
            // so you might rely on other signals or leave it as false here.
            const deprecated = false;

            packageInfoCache.set(pkg.name, {
              latest: latestVersion,
              deprecated
            });
          } else {
            packageInfoCache.set(pkg.name, {
              latest: 'unknown',
              deprecated: false
            });
          }
        } catch (err) {
          console.error(`Failed to fetch info for ${pkg.name}: ${err.message}`);
          packageInfoCache.set(pkg.name, {
            latest: 'unknown',
            deprecated: false
          });
        }
      }

      const pkgInfo = packageInfoCache.get(pkg.name);

      // Determine status
      let status = '✅ Up-to-date';
      if (pkgInfo.deprecated) {
        status = '🔴 Deprecated';
      } else if (pkg.version !== pkgInfo.latest) {
        status = '⚠️ Outdated';
      }

      entries.push({
        name: pkg.name,
        version: pkg.version,
        latest: pkgInfo.latest,
        status,
        deprecated: pkgInfo.deprecated
      });
    }

    csprojEntries.set(fixedPath, entries);
  }

  // Compute summary
  const totalPackages = packageInfoCache.size;

  let outdatedCount = 0;
  for (const [pkgName, info] of packageInfoCache.entries()) {
    if (info.deprecated) continue;
    const usedVersions = packageUsageVersions.get(pkgName);
    if (!usedVersions) continue;
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
  <meta charset="UTF-8" />
  <title>NuGet Dependency Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr.deprecated td { background-color: #ffe6e6; }
    td.path { font-weight: bold; background-color: #ddd; text-align: center; }
    .summary { margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>NuGet Dependency Report</h1>
  <div class="summary">
    <p><strong>Total Unique Packages:</strong> ${totalPackages}</p>
    <p><strong>Outdated Packages:</strong> ${outdatedCount}</p>
  </div>
  <table>
    <tr>
      <th>Package Name</th>
      <th>Version</th>
      <th>Latest Version</th>
      <th>Status</th>
    </tr>
`;

  for (const [csprojPath, entries] of csprojEntries.entries()) {
    if (entries.length > 0) {
      html += `<tr><td class="path" colspan="4">${csprojPath}</td></tr>`;
      for (const entry of entries) {
        html += `
      <tr class="${entry.deprecated ? 'deprecated' : ''}">
        <td>${entry.name}</td>
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

  await fs.writeFile(srcDir + '/nuget-dependency-report.html', html, 'utf8');
  console.log('✅ NuGet HTML report saved as nuget-dependency-report.html');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
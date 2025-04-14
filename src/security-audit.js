import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as glob from 'glob';

// Regular expressions to detect potential hardcoded credentials.
const hardcodedPatterns = [
  /apikey\s*=\s*['"][a-zA-Z0-9_\-]{32,}['"]/gi,
  /token\s*=\s*['"][a-zA-Z0-9_\-]{32,}['"]/gi,
  /password\s*=\s*['"][^'"]{6,}['"]/gi,
];

// Unsafe patterns: calls to eval or exec may be red flags.
const unsafePatterns = [
  /eval\(/gi,
  /exec\(/gi,
];

function runComposerAudit(projectPath) {
  return new Promise((resolve, reject) => {
    exec('composer audit --format=json', { cwd: projectPath }, (error, stdout) => {
      if (!stdout.trim()) {
        reject('composer audit returned empty output');
        return;
      }
      try {
        const auditReport = JSON.parse(stdout);
        const vulnerabilities = [];
        if (auditReport.advisories) {
          for (const [packageName, advisories] of Object.entries(auditReport.advisories)) {
            if (Array.isArray(advisories)) {
              advisories.forEach((adv) => {
                vulnerabilities.push({
                  packageName,
                  advisoryId: adv.advisoryId || undefined,
                  title: adv.title || 'undefined',
                  cve: adv.cve || undefined,
                  link: adv.link || 'No URL provided',
                  reportedAt: adv.reportedAt || undefined,
                  severity: adv.severity || undefined,
                  sources: adv.sources || []
                });
              });
            } else if (typeof advisories === 'object' && advisories !== null) {
              // If advisories is an object (keys like "2", "3", etc.)
              Object.values(advisories).forEach((adv) => {
                vulnerabilities.push({
                  packageName,
                  advisoryId: adv.advisoryId || undefined,
                  title: adv.title || 'undefined',
                  cve: adv.cve || undefined,
                  link: adv.link || 'No URL provided',
                  reportedAt: adv.reportedAt || undefined,
                  severity: adv.severity || undefined,
                  sources: adv.sources || []
                });
              });
            }
          }
        }
        const deprecatedDependencies = [];
        if (auditReport.abandoned) {
          for (const [packageName, replacement] of Object.entries(auditReport.abandoned)) {
            deprecatedDependencies.push(`${packageName} is abandoned, use ${replacement} instead.`);
          }
        }
        resolve({ vulnerabilities, deprecatedDependencies });
      } catch (parseError) {
        reject(`Error parsing composer audit output: ${parseError}`);
      }
    });
  });
}

function scanFilesForPatterns(files, patterns) {
  const matches = [];
  files.forEach((file) => {
    const filePath = path.resolve(file);
    if (fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, 'utf8');
      patterns.forEach((pattern) => {
        const match = content.match(pattern);
        if (match) {
          matches.push(`${file}: ${match[0]}`);
        }
      });
    }
  });
  return matches;
}

function findDeprecatedDependencies(projectPath) {
  return new Promise((resolve, reject) => {
    exec('composer outdated --format=json', { cwd: projectPath }, (error, stdout) => {
      if (error && error.code !== 1) {
        reject(`Error running composer outdated: ${error.message}`);
        return;
      }
      try {
        const outdated = JSON.parse(stdout || '{}');
        const deprecatedDependencies = [];
        if (Array.isArray(outdated)) {
          outdated.forEach(pkg => {
            deprecatedDependencies.push(`${pkg.name} - Current: ${pkg.version}, Latest: ${pkg.latest}`);
          });
        } else if (Array.isArray(outdated.packages)) {
          outdated.packages.forEach(pkg => {
            deprecatedDependencies.push(`${pkg.name} - Current: ${pkg.version}, Latest: ${pkg.latest}`);
          });
        }
        resolve(deprecatedDependencies);
      } catch (parseError) {
        reject(`Error parsing composer outdated output: ${parseError}`);
      }
    });
  });
}

export async function runSecurityAudit(projectPath) {
  console.log('Running PHP security audit...');
  
  const files = glob.sync('**/*.{php,html,inc}', { cwd: projectPath, absolute: true });
  const hardcodedCredentials = scanFilesForPatterns(files, hardcodedPatterns);
  const unsafePatternsFound = scanFilesForPatterns(files, unsafePatterns);

  let vulnerabilities = [];
  let deprecatedDependencies = [];
  try {
    const result = await runComposerAudit(projectPath);
    vulnerabilities = result.vulnerabilities;
    deprecatedDependencies = result.deprecatedDependencies;
  } catch (err) {
    vulnerabilities = [`Error during composer audit: ${err}`];
  }

  try {
    const outdatedDeps = await findDeprecatedDependencies(projectPath);
    deprecatedDependencies = deprecatedDependencies.concat(outdatedDeps);
  } catch (err) {
    deprecatedDependencies.push(`Error during composer outdated: ${err}`);
  }

  return {
    hardcodedCredentials,
    unsafePatterns: unsafePatternsFound,
    vulnerabilities,
    deprecatedDependencies,
  };
}

const projectPath = "D:\\Data\\Official\\trial\\online-shopping-system-master";

runSecurityAudit(projectPath)
  .then(result => {
    console.log(JSON.stringify({ security: result }, null, 2));
  })
  .catch(error => {
    console.error(error);
  });

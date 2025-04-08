import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as glob from 'glob';

/**
 * @typedef {Object} SecurityAuditResult
 * @property {string[]} hardcodedCredentials
 * @property {string[]} unsafePatterns 
 * @property {string[]} vulnerabilities 
 * @property {string[]} deprecatedDependencies 
 */

const hardcodedPatterns = [
  /apikey\s*=\s*['"][a-zA-Z0-9_\-]{32,}['"]/gi,
  /token\s*=\s*['"][a-zA-Z0-9_\-]{32,}['"]/gi,
  /password\s*=\s*['"][^'"]{6,}['"]/gi,
];
const unsafePatterns = [
  /eval\(/gi,
  /exec\(/gi,
];

/**
 * @param {string} projectPath
 * @returns {Promise<string[]>} 
 */
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
                vulnerabilities.push(
                  `${packageName} - ${adv.title || 'undefined'}: ${adv.link || 'No URL provided'}`
                );
              });
            }
          }
        }
        resolve(vulnerabilities);
      } catch (parseError) {
        reject(`Error parsing composer audit output: ${parseError}`);
      }
    });
  });
}

/**
 * @param {string[]} files
 * @param {RegExp[]} patterns
 * @returns {string[]}
 */
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

/**
 * @param {string} projectPath 
 * @returns {Promise<string[]>}
 */
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

/**
 * @param {string} projectPath
 * @returns {Promise<SecurityAuditResult>}
 */
export async function runSecurityAudit(projectPath) {
  console.log('Running PHP security audit...');

  const files = glob.sync('**/*.{php,html,inc}', { cwd: projectPath, absolute: true });
  const hardcodedCredentials = scanFilesForPatterns(files, hardcodedPatterns);
  const unsafePatternsFound = scanFilesForPatterns(files, unsafePatterns);

  let vulnerabilities = [];
  try {
    vulnerabilities = await runComposerAudit(projectPath);
  } catch (err) {
    vulnerabilities = [`Error during composer audit: ${err}`];
  }

  let deprecatedDependencies = [];
  try {
    deprecatedDependencies = await findDeprecatedDependencies(projectPath);
  } catch (err) {
    deprecatedDependencies = [`Error during composer outdated: ${err}`];
  }

  return {
    hardcodedCredentials,
    unsafePatterns: unsafePatternsFound,
    vulnerabilities,
    deprecatedDependencies,
  };
}
// const projectPath = "D:\\Data\\Official\\trial\\php-json-form-submit-master";
const projectPath = "D:\\Data\\Official\\trial\\online-shopping-system-master";
runSecurityAudit(projectPath)
  .then(result => {
    console.log(JSON.stringify({ security: result }, null, 2));
  })
  .catch(error => {
    console.error(error);
  });

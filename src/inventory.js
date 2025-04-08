import fs from "fs";
import path from "path";

// Folders to exclude
const EXCLUDED_DIRS = [
  "vendor",
  "node_modules",
  "storage",
  "logs",
  "tests",
  "coverage",
  ".git",
];

// File types to completely skip (binary or non-code files)
const SKIP_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".mp4",
  ".mp3",
  ".woff",
  ".ttf",
  ".zip",
  ".exe",
  ".ico",
  ".pdf",
];

function getFileExtension(file) {
  const ext = path.extname(file);
  return ext ? ext.toLowerCase() : "[no-extension]";
}

function shouldSkipByExtension(fileName) {
  const ext = getFileExtension(fileName);
  return SKIP_EXTENSIONS.includes(ext);
}

// Determine the type of file based on its extension.
// For a PHP project
// -Files ending with ".php" are "Script"
// -Files ending with ".json" are "JSON File"
// -All others (that are not skipped) are "Other"
function determineFileType(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === "[no-extension]") {
    return null; 
  }
  if (ext === ".php") {
    return "Script";
  } else if (ext === ".json") {
    return "JSON File";
  }
  return "Other";
}

function traverseDirectory(dirPath, metrics = []) {
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry)) {
        traverseDirectory(fullPath, metrics);
      }
    } else {
      if (shouldSkipByExtension(entry)) continue;

      const type = determineFileType(entry);
      if (!type) continue;

      metrics.push({
        type: type,
        filePath: fullPath,
        moduleName: path.basename(fullPath)
      });
    }
  }
  return metrics;
}

const projectPath = "D:\\Data\\Official\\trial\\php-json-form-submit-master";

const moduleMetrics = traverseDirectory(projectPath);

let totalScripts = 0;
let totalJSONFiles = 0;
let totalOtherFiles = 0;

moduleMetrics.forEach(metric => {
  if (metric.type === "Script") totalScripts++;
  else if (metric.type === "JSON File") totalJSONFiles++;
  else if (metric.type === "Other") totalOtherFiles++;
});

const totalModules = totalScripts;

const totalDependencies = 0;

const totalFiles = moduleMetrics.length;

function getPercentage(part, whole) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

const percentageDistribution = {
  modules: getPercentage(totalModules, totalFiles),
  scripts: getPercentage(totalScripts, totalFiles),
  jsonFiles: getPercentage(totalJSONFiles, totalFiles),
  otherFiles: getPercentage(totalOtherFiles, totalFiles),
  dependencies: getPercentage(totalDependencies, totalFiles)
};

const inventory = {
  inventory: {
    totalModules: totalModules,
    totalScripts: totalScripts,
    moduleMetrics: moduleMetrics,
    totalJSONFiles: totalJSONFiles,
    totalOtherFiles: totalOtherFiles,
    totalDependencies: totalDependencies,
    percentageDistribution: percentageDistribution
  }
};

console.log(JSON.stringify(inventory, null, 2));

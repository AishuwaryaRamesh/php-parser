import fs from "fs";
import path from "path";

const EXCLUDED_DIRS = [
  "vendor",
  "node_modules",
  "storage",
  "logs",
  "tests",
  "coverage",
  ".git",
];

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
  ".md",
  ".",
];

const fileTypeStats = {};
const fileMetrics = [];

function getFileExtension(file) {
  const ext = path.extname(file);
  return ext ? ext.toLowerCase() : "[no-extension]";
}

function isProbablyBinary(buffer) {
  return buffer.includes(0);
}

function countLinesInFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").length;
}

function shouldSkipByExtension(fileName) {
  const ext = getFileExtension(fileName);
  return ext === "[no-extension]" || SKIP_EXTENSIONS.includes(ext);
}

function countLinesInDirectory(dirPath, projectPath) {
  let totalLines = 0;
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry)) {
        totalLines += countLinesInDirectory(fullPath, projectPath);
      }
    } else {
      if (shouldSkipByExtension(entry)) continue;

      let lines = 0;
      try {
        const buffer = fs.readFileSync(fullPath);
        if (isProbablyBinary(buffer)) continue;
        lines = buffer.toString("utf-8").split("\n").length;
      } catch {
        continue;
      }

      totalLines += lines;
      const ext = getFileExtension(entry);
      fileTypeStats[ext] = (fileTypeStats[ext] || 0) + lines;
      const relativeFileName = path.relative(projectPath, fullPath);

      fileMetrics.push({
        lines: lines,
        fileName: relativeFileName,
        fileType: ext.startsWith(".") ? ext.slice(1) : ext,
      });
    }
  }

  return totalLines;
}

const projectPath = "D:\\Data\\Official\\trial\\php-json-form-submit-master";

const totalLines = countLinesInDirectory(projectPath, projectPath);
const totalFiles = fileMetrics.length;
const averageLOC = totalFiles ? totalLines / totalFiles : 0;

const output = {
  loc: {
    totalLOC: totalLines,
    averageLOC: parseFloat(averageLOC.toFixed(2)),
    totalFiles: totalFiles,
    fileMetrics: fileMetrics,
  },
};

console.log(JSON.stringify(output, null, 2));

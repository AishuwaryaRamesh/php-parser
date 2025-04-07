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
];

const fileTypeStats = {};

function getFileExtension(file) {
  const ext = path.extname(file);
  return ext ? ext.toLowerCase() : "[no-extension]";
}

function isProbablyBinary(buffer) {
  return buffer.includes(0);
}

function isPhpFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (isProbablyBinary(buffer)) return false;

    const content = buffer.toString("utf-8");
    return content.includes("<?php") || content.includes("<?=");
  } catch {
    return false;
  }
}

function countLinesInFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").length;
}

function shouldSkipByExtension(fileName) {
  const ext = getFileExtension(fileName);
  return SKIP_EXTENSIONS.includes(ext);
}

function countLinesInDirectory(dirPath) {
  let totalLines = 0;
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry)) {
        totalLines += countLinesInDirectory(fullPath);
      }
    } else {
      if (!shouldSkipByExtension(entry) && isPhpFile(fullPath)) {
        const lines = countLinesInFile(fullPath);
        const ext = getFileExtension(entry);
        fileTypeStats[ext] = (fileTypeStats[ext] || 0) + lines;
        totalLines += lines;
      }
    }
  }

  return totalLines;
}

const projectPath = "d:\\Data\\Official\\mvc-ecommerce";

const totalLines = countLinesInDirectory(projectPath);

console.log(`\n Total lines of PHP code: ${totalLines}`);
console.log(`📁 Breakdown by file type:`);
for (const [ext, lines] of Object.entries(fileTypeStats)) {
  console.log(`   ${ext} → ${lines} lines`);
}

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

// File types to ignore (binary/non-code)
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

const folderFileCounts = {};

function getFileExtension(file) {
  const ext = path.extname(file);
  return ext ? ext.toLowerCase() : "[no-extension]";
}

function shouldSkipByExtension(fileName) {
  const ext = getFileExtension(fileName);
  return SKIP_EXTENSIONS.includes(ext);
}

function countFilesByFolder(dirPath, relativeRoot = "") {
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = fs.statSync(fullPath);
    const relativePath = path.join(relativeRoot, entry);

    if (stats.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry)) {
        countFilesByFolder(fullPath, relativePath);
      }
    } else {
      if (!shouldSkipByExtension(entry)) {
        const folderKey = relativeRoot || ".";
        folderFileCounts[folderKey] = (folderFileCounts[folderKey] || 0) + 1;
      }
    }
  }
}

const projectPath = "d:\\Data\\Official\\mvc-ecommerce";
countFilesByFolder(projectPath);

const totalFiles = Object.values(folderFileCounts).reduce((a, b) => a + b, 0);

console.log(`\n PHP Project Folder File Count Distribution`);
console.log(`Total non-binary files: ${totalFiles}\n`);

const sorted = Object.entries(folderFileCounts).sort((a, b) => b[1] - a[1]);

for (const [folder, count] of sorted) {
  const percentage = ((count / totalFiles) * 100).toFixed(2);
  console.log(`${folder.padEnd(40)} → ${count} files  (${percentage}%)`);
}

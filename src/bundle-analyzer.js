import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

function detectEntryPoint(projectPath) {
  console.log('Detecting PHP entry point...');
  const candidates = [
    'public/index.php',
    'index.php',
    'src/index.php',
    'app.php'
  ];

  for (const candidate of candidates) {
    const candidatePath = path.join(projectPath, candidate);
    if (fs.existsSync(candidatePath)) {
      console.log(`Found entry point: ${candidate} (via candidate list)`);
      return [`./${candidate}`, 'candidate list'];
    }
  }
  throw new Error('Unable to detect PHP entry point. Searched common candidate files but found none.');
}

function ensurePharWritable() {
  return new Promise((resolve, reject) => {
    exec('php -r "echo ini_get(\'phar.readonly\');"', (error, stdout) => {
      if (error) {
        reject(new Error(`Failed to run PHP: ${error.message}`));
        return;
      }
      if (stdout.trim() !== '0') {
        reject(new Error('PHP configuration "phar.readonly" is enabled. Please disable it in php.ini (set to 0) before bundling.'));
        return;
      }
      resolve();
    });
  });
}

function generatePharBuildScript(projectPath, buildScriptPath, outputDir, entryPoint) {
  console.log('Generating PHP PHAR build script...');
  const scriptContent = `<?php
// Ensure the phar.readonly ini setting is disabled.
if (ini_get('phar.readonly')) {
  fwrite(STDERR, "phar.readonly is enabled. Please disable it in php.ini.\\n");
  exit(1);
}

$projectDir = __DIR__;
$entryPoint = ${JSON.stringify(entryPoint)};
// The output file will be placed one level up (or specify relative to current dir)
$outputPath = ${JSON.stringify(path.resolve(outputDir, 'bundle.phar'))};

try {
    // Remove existing PHAR if it exists.
    if (file_exists($outputPath)) {
        unlink($outputPath);
    }

    $phar = new Phar($outputPath, 0, 'bundle.phar');
    // Begin buffering. This improves build performance.
    $phar->startBuffering();
    // Build the PHAR archive from the entire project directory.
    // You can adjust the file inclusion/exclusion as needed.
    $phar->buildFromDirectory($projectDir, '/\\.(php)$/i');
    // Set the stub. The stub allows the PHAR archive to be executed.
    $stub = "<?php Phar::mapPhar('bundle.phar'); include 'phar://bundle.phar/{$entryPoint}'; __HALT_COMPILER(); ?>";
    $phar->setStub($stub);
    $phar->stopBuffering();
    echo "PHAR bundle built successfully at: $outputPath\\n";
} catch (Exception $e) {
    fwrite(STDERR, "Error building PHAR: " . $e->getMessage() . "\\n");
    exit(1);
}
?>`;
  fs.writeFileSync(buildScriptPath, scriptContent);
  console.log('PHAR build script generated.');
}

function runPharBundler(projectPath, buildScriptPath) {
  console.log('Starting PHAR bundling process...');
  return new Promise((resolve, reject) => {
    exec(`php ${buildScriptPath}`, { cwd: projectPath, timeout: 5 * 60 * 1000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`PHAR bundling failed: ${stdout}\n${stderr}`));
        return;
      }
      console.log(stdout);
      resolve();
    });
  });
}

function cleanupArtifacts(buildScriptPath) {
  console.log('Cleaning up temporary artifacts...');
  if (fs.existsSync(buildScriptPath)) {
    fs.unlinkSync(buildScriptPath);
    console.log('Temporary build script removed.');
  }
}


export async function analyzePHPBundleProject(projectPath, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    projectPath,
    status: 'failure'
  };

  const buildScriptPath = path.join(projectPath, 'build-phar.php');

  try {
    await ensurePharWritable();

    const [entryPoint, entryType] = detectEntryPoint(projectPath);
    console.log(`Detected PHP entry point: ${entryPoint} (via ${entryType})`);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    generatePharBuildScript(projectPath, buildScriptPath, outputDir, entryPoint);

    await runPharBundler(projectPath, buildScriptPath);

    if (!fs.existsSync(outputPath)) {
      throw new Error('Bundle PHAR file was not created.');
    }
    const stats = fs.statSync(outputPath);
    report.bundleSize = stats.size;
    report.bundleSizeFormatted = `${(stats.size / 1024).toFixed(2)} KB`;
    report.status = 'success';
    console.log(`Bundle analysis complete. Bundle size: ${report.bundleSizeFormatted}`);
  } catch (error) {
    report.status = 'failure';
    report.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(report.error);
  } finally {
    try {
      cleanupArtifacts(buildScriptPath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary artifacts:', cleanupError);
    }
  }

  return report;
}

const projectPath = "D:\\Data\\Official\\trial\\online-shopping-system-master";
const bundleOutputPath = path.join(projectPath, 'build', 'bundle.phar');

analyzePHPBundleProject(projectPath, bundleOutputPath)
  .then(report => {
    console.log(JSON.stringify(report, null, 2));
  })
  .catch(error => {
    console.error("An error occurred during analysis:", error);
  });

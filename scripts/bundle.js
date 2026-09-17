/**
 * Output a JavaScript file as an IIFE bundle that can be used in the browser.
 *
 * Usage: node scripts/bundle.js <input.js> <output.js> [entryPointName]
 *
 * @param inputFile {string} The path to the input JavaScript file to bundle.
 * @param outputFile {string} The path to the output JavaScript file to write.
 * @param moduleEntryPoint {string} Optional. The name of the global variable for the IIFE. Defaults to "module".
 */
import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const __dirname = process.cwd();

async function main() {
  const [, , inputFile, outputFile, moduleEntryPoint = "module"] = process.argv;

  if (!inputFile || !outputFile) {
    console.error(
      "Usage: node scripts/bundle.js <input.js> <output.js> [entryPointName]"
    );
    process.exit(1);
  }

  const inputPath = path.resolve(__dirname, inputFile);
  const outputPath = path.resolve(__dirname, outputFile);

  // Bundle into memory
  const result = await build({
    entryPoints: [inputPath],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    globalName: moduleEntryPoint,
    target: "es2023",
  });

  const bundleOutput = result.outputFiles[0].text.trim();
  await writeFile(outputPath, bundleOutput, "utf8");
  console.log(`Wrote IIFE bundle to ${outputPath}`);
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}

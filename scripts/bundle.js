/**
 * This module is a proof-of-concept for bundling a JavaScript file into a single <script> tag that can be injected into the DOM.
 * It uses esbuild to bundle the input file and its dependencies, and then wraps the output in a <script> tag that is
 * appended to the <head> of the document.
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
    globalName: moduleEntryPoint
  });

  const bundleOutput = result.outputFiles[0].text.trim()
    .replace(/\\`/g, "\\u005c\\u0060")
    .replace(/`/g, "\\`"); // Escape backticks for template literal

  // Output wrapper that creates <script>, sets textContent, and injects into <head>
  const wrapped = `const s = document.createElement("script");
s.textContent = \`${bundleOutput}\`;
document.head.appendChild(s);
`;

  await writeFile(outputPath, wrapped, "utf8");
  console.log(`Wrote wrapped bundle to ${outputPath}`);
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}

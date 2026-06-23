import { open } from "node:fs/promises";
import { join } from "node:path";

async function getText(filename) {
    await using file = await open(join(import.meta.dirname, filename));
    const content = await file.readFile("utf-8");
    await file.close();
    return content.split("\n").map(line => line.trim()).filter(line => line.length > 0);
}

async function writeText(filename, lines) {
    await using file = await open(join(import.meta.dirname, filename), "w");
    await file.write(lines.join("\n"));
    await file.close();
}

/**
 * @param {string} mainFile The file that contains the body text to filter
 * @param {string} filterFile The file that contains the lines of text to use as a filter
async function main(mainFile, filterFile) {
    const body = await getText(mainFile);
    const filterTerms = await getText(filterFile);
    const filtered = body.filter(line => !filterTerms.includes(line));
    await writeText("filtered.txt", filtered);
}

await main();

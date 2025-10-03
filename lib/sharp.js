import process from "node:process";
import { homedir } from "node:os";
import pathLib from "node:path";
import sharp from "sharp";

function displayUsage() {
    console.log("Usage:");
    console.log("node lib/sharp.js input_file output_file[.png]\n");
}

function expandFilename(filename) {
    let result = /^~/.test(filename) ? filename.replace(/^~/, homedir()) : filename;
    return /^\./.test(result) ? pathLib.resolve(process.cwd(), result) : result;
}

function checkExtension(filename) {
    return filename.replace(/(\w)(?:\.[a-z]*)?$/, "$1.png");
}

/**
 * Convert a file from one image format to PNG. This does not perform any image resizing.
 *
 * @param inputFile {String} The path to the file to convert
 * @param outputFile {String} The path of the new image
 */
async function convertImageToPNG(inputFile, outputFile) {
    if (/\.(svg|jpe?g)$/i.test(inputFile) && outputFile.trim().length > 0) {
        const outName = checkExtension(expandFilename(outputFile));
        await sharp(expandFilename(inputFile), { density: 300 }).toFile(outName);
    } else {
        displayUsage();
    }
}

await convertImageToPNG(process.argv[2], process.argv[3]);

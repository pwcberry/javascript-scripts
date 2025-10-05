import process from "node:process";
import sharp from "sharp";
import { stampExtension, expandFilename } from "./util.js";

function displayUsage() {
    console.log("Usage:");
    console.log("node lib/sharp.js input_file output_file[.png]\n");
}

/**
 * Convert a file from one image format to PNG. This does not perform any image resizing.
 *
 * @param inputFile {String} The path to the file to convert
 * @param outputFile {String} The path of the new image
 */
async function convertImageToPNG(inputFile, outputFile) {
    if (/\.(svg|jpe?g)$/i.test(inputFile) && outputFile.trim().length > 0) {
        const outName = stampExtension(expandFilename(outputFile));
        await sharp(expandFilename(inputFile), { density: 300 }).toFile(outName);
    } else {
        displayUsage();
    }
}

await convertImageToPNG(process.argv[2], process.argv[3]);

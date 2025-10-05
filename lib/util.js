import { homedir } from "node:os";
import pathLib from "node:path";
import process from "node:process";

/**
 * Download a text file generated in the browser.
 *
 * @param filename {string} The name to download the file as
 * @param data {string} The string data to use for the blob
 */
export function downloadFile(filename, data = "") {
    const blob = new Blob([data], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);

    // Create a temporary link to invoke download
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
}

export function expandFilename(filename) {
    let result = /^~/.test(filename) ? filename.replace(/^~/, homedir()) : filename;
    return /^\./.test(result) ? pathLib.resolve(process.cwd(), result) : result;
}

export function stampExtension(filename, extension = "png") {
    return filename.replace(/(\w)(?:\.[a-z]*)?$/, `$1.${extension}`);
}

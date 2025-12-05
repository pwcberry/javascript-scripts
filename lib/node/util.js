import { homedir } from "node:os";
import {open} from "node:fs/promises";
import pathLib from "node:path";
import process from "node:process";

function expandFilename(filename) {
    let result = /^~/.test(filename) ? filename.replace(/^~/, homedir()) : filename;
    return /^\./.test(result) ? pathLib.resolve(process.cwd(), result) : result;
}

const stampExtension = (filename, extension = "png") => filename.replace(/(\w)(?:\.[a-z]*)?$/, `$1.${extension}`);

async function fetchLocalData(filename, isJson = true) {
    const fileHandle = await open(filename, "r");
    const fileData = await fileHandle.readFile({ encoding: "utf8" });
    await fileHandle.close();
    return isJson ? JSON.parse(fileData) : fileData;
}

export {
    expandFilename,
    stampExtension,
    fetchLocalData
};

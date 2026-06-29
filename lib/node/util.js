import {open} from "node:fs/promises";
import Buffer from "node:buffer";
import crypto from "node:crypto";

function makeKey() {
    const buf = Buffer.alloc(9);
    return crypto.randomFillSync(buf).toString("hex");
}

function getTimestamp() {
    const ts = /([\d-]+)T([\d:]+)\.\d+Z/.exec((new Date).toISOString());
    return ts[1].replace(/\W/g, "") + "-" + ts[2].replace(/\W/g, "");
}

const stampExtension = (filename, extension = "png") => filename.replace(/(\w)(?:\.[a-z]*)?$/, `$1.${extension}`);

async function fetchLocalData(filename, isJson = true) {
    const fileHandle = await open(filename, "r");
    const fileData = await fileHandle.readFile({ encoding: "utf8" });
    await fileHandle.close();
    return isJson ? JSON.parse(fileData) : fileData;
}

export { fetchLocalData, getTimestamp, stampExtension };

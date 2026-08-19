import { open } from "node:fs/promises";
import Buffer from "node:buffer";
import crypto from "node:crypto";

const createHash = data => crypto.createHash("md5").update(data).digest("hex");
const stampExtension = (filename, extension = "png") => filename.replace(/(\w)(?:\.[a-z]*)?$/, `$1.${extension}`);

function makeKey() {
  const buf = Buffer.alloc(9);
  return crypto.randomFillSync(buf).toString("hex");
}

function getTimestamp() {
  const ts = /([\d-]+)T([\d:]+)\.\d+Z/.exec((new Date()).toISOString());
  return ts[1].replace(/\W/g, "") + "-" + ts[2].replace(/\W/g, "");
}

async function fetchLocalData(filename, isJson = true) {
  const fileHandle = await open(filename, "r");
  const fileData = await fileHandle.readFile({ encoding: "utf8" });
  await fileHandle.close();
  return isJson ? JSON.parse(fileData) : fileData;
}

export { createHash, fetchLocalData, getTimestamp, makeKey, stampExtension };

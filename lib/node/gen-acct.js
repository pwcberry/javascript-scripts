import { open } from "node:fs/promises";
import {argv} from "node:process";
import {generateAccountList} from "./account.js";
import {expandFilename} from "./util.js";

/**
 * @param {string} outputFile The file to save the JSON formatted objects
 * @param {number} count The number of accounts to generate
 * @returns {Promise<void>}
 */
async function main(outputFile, count = 20) {
    const accounts = Array.from(generateAccountList(count));
    const handle = await open(expandFilename(outputFile), "w");
    await handle.writeFile(JSON.stringify(accounts, null, 2), {encoding: "utf8"});
    await handle.close();
}

/**
 * Generate accounts.
 */
await main(argv[2], parseInt(argv[3]));

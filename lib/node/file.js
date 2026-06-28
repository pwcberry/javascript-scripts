import os from "node:os";
import { join } from "node:path";
import { open } from "node:fs/promises";

async function checkDirExists(path) {
    let result;

    try {
        await using handle = await open(path, "r");
        const stat = await handle.stat();
        await handle.close();

        result = stat.isDirectory();
    } catch {
        result = false;
    }

    return result;
}

function resolvePath(path) {
    return path.startsWith("~") ? join(os.homedir(), path.slice(1)) :  path;
}

export {
    checkDirExists,
    resolvePath,
}

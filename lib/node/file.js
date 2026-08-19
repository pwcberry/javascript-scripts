import os from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { open } from "node:fs/promises";

async function checkDirExists(path) {
  let result;

  try {
    await using handle = await open(path, "r");
    const stat = await handle.stat();
    await handle.close();

    result = stat.isDirectory();
  }
  catch {
    result = false;
  }

  return result;
}

/**
 * Resolves a sequence of path segments, with the semantics of Node's `path.resolve`,
 * with two additional behaviors:
 *   1. Any segment that begins with `~` has the tilde expanded to the current user's
 *      home directory before resolution.
 *   2. When the base path (the first segment) is absolute and a subsequent segment
 *      is also absolute, that subsequent absolute segment is returned as-is
 *      (rather than being combined with any further trailing segments).
 * @param {...string} paths The path segments to resolve. The first segment is the
 *   base path, and subsequent segments are resolved against it.
 * @returns {string} The resolved absolute path.
 */
function resolvePath(...paths) {
  const expanded = paths.map(segment =>
    typeof segment === "string" && segment.startsWith("~")
      ? join(os.homedir(), segment.slice(1))
      : segment,
  );
  const [base, ...rest] = expanded;

  if (isAbsolute(base)) {
    const absolute = rest.find(segment => isAbsolute(segment));
    if (absolute) {
      return absolute;
    }
  }

  return resolve(base, ...rest);
}

export {
  checkDirExists,
  resolvePath,
};

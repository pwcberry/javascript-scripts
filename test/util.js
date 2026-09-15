import { join, resolve } from "node:path";

function getFixturePath(filename = "index.html") {
  const fixtureFolder = resolve(import.meta.dirname, "./fixture");
  return join(fixtureFolder, filename);
}

export {
  getFixturePath,
};

import { join, resolve } from "node:path";

function getFixturePath(filename = "index.html") {
  const fixtureFolder = resolve(import.meta.dirname, "./fixture");
  return join(fixtureFolder, filename);
}

/** @type {(window: Window) => void} */
function setDomGlobals(window) {
  globalThis.document = window.document;
  globalThis.Document = window.Document;
  globalThis.DocumentFragment = window.DocumentFragment;
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
}

export {
  getFixturePath,
  setDomGlobals,
};

import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, it } from "mocha";
import * as td from "testdouble";
import { expect, use } from "chai";
import tdChai from "testdouble-chai";
import { JSDOM } from "jsdom";
import { extractImageData } from "../../lib/browser/image.js";

use(tdChai(td));

describe("image.js", () => {
  let dom;

  /** @type {(window: Window) => void} */
  const setDomGlobals = (window) => {
    globalThis.HTMLImageElement = window.HTMLImageElement;
    globalThis.FileReader = window.FileReader;
    globalThis.Blob = window.Blob;
  };

  beforeEach(() => {
    dom = new JSDOM(
      "<!DOCTYPE html><html lang='en'><body><img src=\"https://example.com/cat.png\" alt=\"A cat\"></body></html>",
    );
    setDomGlobals(dom.window);
  });

  afterEach(() => {
    td.reset();
    delete globalThis.fetch;
  });

  describe("#extractImageData", () => {
    it("throws when the argument is not an HTMLImageElement", async () => {
      try {
        await extractImageData(dom.window.document.body);
        expect.fail("Expected extractImageData to reject with a TypeError.");
      }
      catch (error) {
        expect(error).to.be.instanceOf(TypeError);
      }
    });

    it("resolves with the Base64-encoded image data and its MIME type", async () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 250, 251]);
      const blob = new dom.window.Blob([bytes], { type: "image/png" });
      const image = dom.window.document.querySelector("img");

      globalThis.fetch = td.func("fetch");
      td.when(globalThis.fetch(image.src)).thenResolve({ blob: () => Promise.resolve(blob) });

      const result = await extractImageData(image);

      expect(result).to.deep.equal({
        data: Buffer.from(bytes).toString("base64"),
        type: "image/png",
      });
    });
  });
});

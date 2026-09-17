import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, it } from "mocha";
import * as td from "testdouble";
import { expect, use } from "chai";
import tdChai from "testdouble-chai";
import { JSDOM } from "jsdom";
import { extractImageData, renderImageToBlob } from "../../lib/browser/image.js";

use(tdChai(td));

describe("image.js", () => {
  let dom;

  /** @type {(window: Window) => void} */
  const setDomGlobals = (window) => {
    globalThis.HTMLImageElement = window.HTMLImageElement;
    globalThis.FileReader = window.FileReader;
    globalThis.Blob = window.Blob;
    globalThis.document = window.document;
  };

  /** @type {(image: HTMLImageElement, width: number, height: number) => void} */
  const setNaturalSize = (image, width, height) => {
    Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: height, configurable: true });
  };

  /** @type {(canvas: object) => void} */
  const stubCanvasCreation = (canvas) => {
    const createElement = dom.window.document.createElement.bind(dom.window.document);
    td.replace(dom.window.document, "createElement", tagName => (
      tagName === "canvas" ? canvas : createElement(tagName)
    ));
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
    delete globalThis.document;
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

  describe("#renderImageToBlob", () => {
    it("throws when the argument is not an HTMLImageElement", async () => {
      try {
        await renderImageToBlob(dom.window.document.body);
        expect.fail("Expected renderImageToBlob to reject with a TypeError.");
      }
      catch (error) {
        expect(error).to.be.instanceOf(TypeError);
      }
    });

    it("draws the image onto a canvas sized to its natural dimensions and resolves with the bitmap and its type", async () => {
      const image = dom.window.document.querySelector("img");
      setNaturalSize(image, 100, 50);

      const blob = new dom.window.Blob([new Uint8Array([9, 9])], { type: "image/png" });
      const context = { drawImage: td.func("drawImage") };
      const canvas = { getContext: td.func("getContext"), toBlob: td.func("toBlob") };
      td.when(canvas.getContext("2d")).thenReturn(context);
      td.when(canvas.toBlob(td.matchers.isA(Function))).thenDo(callback => callback(blob));
      stubCanvasCreation(canvas);

      const result = await renderImageToBlob(image);

      expect(canvas.width).to.equal(100);
      expect(canvas.height).to.equal(50);
      td.verify(context.drawImage(image, 0, 0));
      expect(result).to.deep.equal({ data: blob, type: "image/png" });
    });

    it("returns null when canvas.toBlob produces no blob", async () => {
      const image = dom.window.document.querySelector("img");
      setNaturalSize(image, 100, 50);

      const context = { drawImage: td.func("drawImage") };
      const canvas = { getContext: td.func("getContext"), toBlob: td.func("toBlob") };
      td.when(canvas.getContext("2d")).thenReturn(context);
      td.when(canvas.toBlob(td.matchers.isA(Function))).thenDo(callback => callback(null));
      stubCanvasCreation(canvas);

      const result = await renderImageToBlob(image);
      expect(result).to.deep.equal({ data: null, type: "image/png" });
    });
  });
});

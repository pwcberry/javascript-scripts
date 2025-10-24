import pathLib from "node:path";
import * as td from "testdouble";
import { expect, use } from "chai";
import tdChai from "testdouble-chai";
import { JSDOM } from "jsdom";

use(tdChai(td));

function getFixturePath(filename) {
    const fixtureFolder = pathLib.resolve(import.meta.dirname, "../fixture");
    return pathLib.join(fixtureFolder, "index.html");
}

describe("turndown.js", () => {
    let module, utilModule, Collector;

    // before(() => {
    //
    // });

    beforeEach(async () => {
        utilModule = td.replace("../../lib/util.js");
        module = await import("../../lib/browser/turndown.js");
        Collector = module.Collector;
    });

    afterEach(() => {
        td.reset();
    });

    describe("turndown", () => {
        // it("should throw an error if the node is not found", () => {
        //     JSDOM.fromFile().then((dom) => {
        //         const node = dom.querySelector(".unknown");
        //         expect(module.turndown(node)).to.throw("Start element does not exist");
        //     });
        // });

        it('should call the "downloadFile" function', () => {
            JSDOM.fromFile(getFixturePath("index.html")).then((dom) => {
                const node = dom.querySelector("h1");
                module.turndown(node);
                expect(utilModule.downloadFile).to.have.been.called();
            });
        });
    });

    describe("Collector", () => {
        it("should collect a paragraph of text", () => {
            const dom = new JSDOM(`<!DOCTYPE html><body><p>This is a paragraph.</p></body>`);
            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("This is a paragraph.\n\n");
        });

        it("should collect a first-level heading", () => {
            const dom = new JSDOM(`<!DOCTYPE html><body><main><h1>This is a heading.</h1></main></body>`);
            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("# This is a heading.\n\n");
        });

        it("should collect a second-level heading", () => {
            const dom = new JSDOM(`<!DOCTYPE html><body><main><h2>This is a heading.</h2></main></body>`);
            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("## This is a heading.\n\n");
        });

        it("should collect a heading and a paragraph of text", () => {
            const dom = new JSDOM(`
          <!DOCTYPE html>
          <body>
            <header><h1>This is a heading.</h1></header>
            <main>
            <div>
            <p>This is a paragraph.</p>
            </div>
            </main>
          </body>
            `);

            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("# This is a heading.\n\nThis is a paragraph.\n\n");
        });

        it("should collect a paragraph and its emphasized text", () => {
            const dom = new JSDOM(`<!DOCTYPE html><body><p>This is a <em>paragraph</em>.</p></body>`);
            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("This is a _paragraph_.\n\n");
        });

        it("should collect a paragraph and its bold text", () => {
            const dom = new JSDOM(`<!DOCTYPE html><body><p><strong>This</strong> is a paragraph.</p></body>`);
            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("**This** is a paragraph.\n\n");
        });

        it("should collect a paragraph and its inline styles", () => {
            const dom = new JSDOM(`<!DOCTYPE html><body><p>This is a <em><strong>paragraph</strong></em>.</p></body>`);
            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("This is a _**paragraph**_.\n\n");
        });

        it("should collect a code snippets in a paragraph", () => {
            const dom = new JSDOM(`<!DOCTYPE html><body><p>This is a <code>paragraph</code>.</p></body>`);
            globalThis.Element = dom.window.Element;
            globalThis.Node = dom.window.Node;

            const c = new Collector(dom.window.document.body);
            c.collect();

            expect(c.content).to.equal("This is a `paragraph`.\n\n");
        });
    });
});

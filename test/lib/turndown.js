import pathLib from "node:path";
import * as td from "testdouble";
import { expect, use } from "chai";
import tdChai from "testdouble-chai";
import { JSDOM } from "jsdom";

use(tdChai(td));

describe("turndown.js", () => {
    let module, utilModule, fixtureFolder;

    before(() => {
        fixtureFolder = pathLib.resolve(import.meta.dirname, "../fixture");
    });

    beforeEach(async () => {
        utilModule = td.replace("../../lib/util.js");
        module = await import("../../lib/turndown.js");
    });

    afterEach(() => {
        td.reset();
    });

    it("should throw an error if the node is not found", () => {
        JSDOM.fromFile(pathLib.join(fixtureFolder, "index.html")).then((dom) => {
            const node = dom.querySelector(".unknown");
            expect(module.turndown(node)).to.throw();
        });
    });

    it('should call the "downloadFile" function', () => {
        JSDOM.fromFile(pathLib.join(fixtureFolder, "index.html")).then((dom) => {
            const node = dom.querySelector("h1");
            module.turndown(node);
            expect(utilModule.downloadFile).to.have.been.called;
        });
    });
});

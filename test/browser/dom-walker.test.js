import { describe, it } from "mocha";
import * as td from "testdouble";
import { expect, use } from "chai";
import tdChai from "testdouble-chai";
import { JSDOM } from "jsdom";
import { walkHtmlDom } from "../../lib/browser/dom-walker.js";
import { getFixturePath, setDomGlobals } from "../util.js";

use(tdChai(td));

describe("dom-walker.js", () => {
  describe("#walkHtmlDom", () => {
    const NO_OP = () => {};

    it("throws when root is a comment", () => {
      const dom = new JSDOM("<!DOCTYPE html><html lang='en'><!-- A Comment --></html>");
      setDomGlobals(dom.window);
      const root = dom.window.document.documentElement.firstChild;

      expect(() => {
        walkHtmlDom(root, NO_OP);
      }).to.throw(TypeError);
    });

    it("throws when root is a text node", () => {
      const dom = new JSDOM("<!DOCTYPE html><html lang='en'><title>TEXT</title></html>");
      setDomGlobals(dom.window);
      const element = dom.window.document.getElementsByTagName("title")[0];
      const root = element.firstChild;

      expect(() => {
        walkHtmlDom(root, NO_OP);
      }).to.throw(TypeError);
    });

    it("throws when visitor function is undefined", () => {
      const dom = new JSDOM("<!DOCTYPE html><html lang='en'><body><h1>Heading</h1></body></html>");
      setDomGlobals(dom.window);
      const root = dom.window.document.documentElement;

      expect(() => {
        walkHtmlDom(root);
      }).to.throw(TypeError);
    });

    it("executes visitor when element encountered", () => {
      const dom = new JSDOM("<!DOCTYPE html><html lang='en'><body><h1>Heading</h1></body></html>");
      setDomGlobals(dom.window);
      const root = dom.window.document.documentElement;
      const visitor = td.func("visitor");

      walkHtmlDom(root, visitor);

      expect(visitor).to.have.been.called;
    });

    it("does not traverse deep when visitor returns false", () => {
      const dom = new JSDOM("<!DOCTYPE html><html lang='en'><body><h1>Heading</h1></body></html>");
      setDomGlobals(dom.window);

      let counter = 0;
      const root = dom.window.document.documentElement;
      const visitor = (element) => {
        switch (element.tagName.toLowerCase()) {
          case "body":
          {
            counter += 1;
            return false;
          }
          case "html":
          case "h1":
            counter += 1;
            break;
        }
      };

      walkHtmlDom(root, visitor);

      expect(counter).to.equal(2);
    });

    it("traverses sibling elements", () => {
      JSDOM.fromFile(getFixturePath()).then((dom) => {
        setDomGlobals(dom.window);

        let counter = 0;
        const root = dom.window.document.documentElement;
        const visitor = (element) => {
          if (element.tagName.toLowerCase() === "li") {
            counter += 1;
          }
        };

        walkHtmlDom(root, visitor);

        expect(counter).to.equal(3);
      });
    });

    it("traverses a document fragment", () => {
      const dom = new JSDOM("<!DOCTYPE html><html lang='en'><body></body></html>");
      setDomGlobals(dom.window);

      const document = dom.window.document;
      const frag = document.createDocumentFragment();

      ["Hello", "World"].forEach((s) => {
        const p = document.createElement("p");
        p.textContent = s;
        frag.append(p);
      });

      let counter = 0;
      const visitor = (_) => {
        counter += 1;
      };

      walkHtmlDom(frag, visitor);

      expect(counter).to.equal(2);
    });

    it("traverses a document", () => {
      const dom = new JSDOM("<!DOCTYPE html><html lang='en'><head><title>TITLE</title></head><body><h1>Heading</h1></body></html>");
      setDomGlobals(dom.window);

      let counter = 0;
      const root = dom.window.document;
      const visitor = (_) => {
        counter += 1;
      };

      walkHtmlDom(root, visitor);

      expect(counter).to.equal(5);
    });
  });
});

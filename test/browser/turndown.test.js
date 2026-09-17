import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, it } from "mocha";
import * as td from "testdouble";
import { expect, use } from "chai";
import tdChai from "testdouble-chai";
import { JSDOM } from "jsdom";
import { getFixturePath, setDomGlobals } from "../util.js";

use(tdChai(td));

const require = createRequire(import.meta.url);

describe("turndown.js", () => {
  const parse = (html) => {
    const dom = new JSDOM(html);
    setDomGlobals(dom.window);
    return dom.window.document;
  };

  describe("#toMarkdown", () => {
    let toMarkdown;

    beforeEach(async () => {
      ({ toMarkdown } = await import("../../lib/browser/turndown.js"));
    });

    describe("headings", () => {
      [1, 2, 3, 4, 5, 6].forEach((level) => {
        it(`converts an h${level} into a level-${level} heading`, () => {
          const document = parse(`<body><h${level}>Heading</h${level}></body>`);
          expect(toMarkdown(document.body)).to.equal(`${"#".repeat(level)} Heading`);
        });
      });

      it("collapses internal whitespace in heading text", () => {
        const document = parse("<body><h1>  Chapter\n  Title  </h1></body>");
        expect(toMarkdown(document.body)).to.equal("# Chapter Title");
      });
    });

    describe("paragraphs", () => {
      it("converts a paragraph of plain text", () => {
        const document = parse("<body><p>This is a paragraph.</p></body>");
        expect(toMarkdown(document.body)).to.equal("This is a paragraph.");
      });

      it("converts a heading followed by a paragraph into two blocks", () => {
        const document = parse("<body><h1>Title</h1><p>Body text.</p></body>");
        expect(toMarkdown(document.body)).to.equal("# Title\n\nBody text.");
      });

      it("descends through non-block container elements to find block content", () => {
        const document = parse("<body><main><div><p>Nested paragraph.</p></div></main></body>");
        expect(toMarkdown(document.body)).to.equal("Nested paragraph.");
      });
    });

    describe("inline formatting", () => {
      it("converts emphasis", () => {
        const document = parse("<body><p>This is <em>emphasized</em>.</p></body>");
        expect(toMarkdown(document.body)).to.equal("This is _emphasized_.");
      });

      it("converts strong text", () => {
        const document = parse("<body><p><strong>Bold</strong> statement.</p></body>");
        expect(toMarkdown(document.body)).to.equal("**Bold** statement.");
      });

      it("converts nested inline formatting", () => {
        const document = parse("<body><p>This is <strong><em>very</em></strong> important.</p></body>");
        expect(toMarkdown(document.body)).to.equal("This is **_very_** important.");
      });

      it("converts inline code", () => {
        const document = parse("<body><p>Run <code>npm test</code> first.</p></body>");
        expect(toMarkdown(document.body)).to.equal("Run `npm test` first.");
      });

      it("converts links", () => {
        const document = parse("<body><p>See <a href=\"https://example.com\">the docs</a>.</p></body>");
        expect(toMarkdown(document.body)).to.equal("See [the docs](https://example.com).");
      });

      it("converts a line break into a hard break", () => {
        const document = parse("<body><p>Line one<br>Line two</p></body>");
        expect(toMarkdown(document.body)).to.equal("Line one  \nLine two");
      });
    });

    describe("images", () => {
      it("converts a block-level image", () => {
        const document = parse("<body><img src=\"cat.png\" alt=\"A cat\"></body>");
        expect(toMarkdown(document.body)).to.equal("![A cat](cat.png)");
      });

      it("converts an inline image within a paragraph", () => {
        const document = parse("<body><p>Look: <img src=\"cat.png\" alt=\"A cat\"></p></body>");
        expect(toMarkdown(document.body)).to.equal("Look: ![A cat](cat.png)");
      });
    });

    describe("lists", () => {
      it("converts an unordered list", () => {
        const document = parse("<body><ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul></body>");
        expect(toMarkdown(document.body)).to.equal("- Item 1\n- Item 2\n- Item 3");
      });

      it("converts an ordered list", async () => {
        const dom = await JSDOM.fromFile(getFixturePath("ordered-list.html"));
        setDomGlobals(dom.window);

        expect(toMarkdown(dom.window.document.body)).to.equal("1. Item 1\n2. Item 2\n3. Item 3");
      });

      it("converts a nested list with two-space indentation per level", async () => {
        const dom = await JSDOM.fromFile(getFixturePath("nested-list.html"));
        setDomGlobals(dom.window);

        expect(toMarkdown(dom.window.document.body)).to.equal(
          "1. Item 1\n2. Item 2\n  - Item C\n  - Item A\n  - Item B\n3. Item 3",
        );
      });
    });

    describe("blockquotes", () => {
      it("converts a blockquote containing a single paragraph", () => {
        const document = parse("<body><blockquote><p>A quote.</p></blockquote></body>");
        expect(toMarkdown(document.body)).to.equal("> A quote.");
      });

      it("converts a blockquote with multiple paragraphs, blank-quoting the gap", () => {
        const document = parse("<body><blockquote><p>First.</p><p>Second.</p></blockquote></body>");
        expect(toMarkdown(document.body)).to.equal("> First.\n>\n> Second.");
      });
    });

    describe("code blocks", () => {
      it("converts a pre/code block into a fenced code block", () => {
        const document = parse("<body><pre><code>const x = 1;</code></pre></body>");
        expect(toMarkdown(document.body)).to.equal("```\nconst x = 1;\n```");
      });

      it("uses the language-* class on the code element as the fence's info string", () => {
        const document = parse("<body><pre><code class=\"language-js\">const x = 1;</code></pre></body>");
        expect(toMarkdown(document.body)).to.equal("```js\nconst x = 1;\n```");
      });
    });

    describe("horizontal rules", () => {
      it("converts a horizontal rule between two paragraphs", () => {
        const document = parse("<body><p>Before.</p><hr><p>After.</p></body>");
        expect(toMarkdown(document.body)).to.equal("Before.\n\n---\n\nAfter.");
      });
    });

    describe("custom visitors", () => {
      it("renders a block-level tag with no built-in handler", () => {
        const document = parse("<body><figure>Diagram</figure></body>");
        const config = {
          visitors: {
            block: {
              figure: (element, { doc, renderInline }) => {
                doc.addBlock(`[FIGURE: ${renderInline().trim()}]`);
                return false;
              },
            },
          },
        };

        expect(toMarkdown(document.body, config)).to.equal("[FIGURE: Diagram]");
      });

      it("renders an inline tag with no built-in handler", () => {
        const document = parse("<body><p>This is <mark>marked</mark> text.</p></body>");
        const config = {
          visitors: {
            inline: {
              mark: (element, exclude, { renderInline }) => `==${renderInline()}==`,
            },
          },
        };

        expect(toMarkdown(document.body, config)).to.equal("This is ==marked== text.");
      });

      it("overrides a built-in block tag's rendering", () => {
        const document = parse("<body><blockquote><p>A quote.</p></blockquote></body>");
        const config = {
          visitors: {
            block: {
              blockquote: (element, { doc, renderInline }) => {
                doc.addBlock(`<<${renderInline(element.firstElementChild).trim()}>>`);
                return false;
              },
            },
          },
        };

        expect(toMarkdown(document.body, config)).to.equal("<<A quote.>>");
      });

      it("overrides a built-in inline tag's rendering", () => {
        const document = parse("<body><p><strong>Bold</strong> statement.</p></body>");
        const config = {
          visitors: {
            inline: {
              strong: (element, exclude, { renderInline }) => `__${renderInline()}__`,
            },
          },
        };

        expect(toMarkdown(document.body, config)).to.equal("__Bold__ statement.");
      });

      it("lets a custom visitor extend the built-in rendering via next()", () => {
        const document = parse("<body><h2>Section</h2></body>");
        const config = {
          visitors: {
            block: {
              h2: (element, { next }) => next(),
            },
          },
        };

        expect(toMarkdown(document.body, config)).to.equal("## Section");
      });

      it("applies custom visitors inside a nested blockquote document", () => {
        const document = parse("<body><blockquote><p>Nested <em>quote</em>.</p></blockquote></body>");
        const config = {
          visitors: {
            inline: {
              em: (element, exclude, { renderInline }) => `*${renderInline()}*`,
            },
          },
        };

        expect(toMarkdown(document.body, config)).to.equal("> Nested *quote*.");
      });

      it("behaves exactly as before when no config is given", () => {
        const document = parse("<body><h1>Title</h1><p>Body <strong>text</strong>.</p></body>");
        expect(toMarkdown(document.body)).to.equal("# Title\n\nBody **text**.");
      });
    });

    describe("roots", () => {
      it("converts starting from an element other than body", () => {
        const document = parse("<body><main><h1>Heading</h1></main><footer><p>Ignored.</p></footer></body>");
        expect(toMarkdown(document.querySelector("main"))).to.equal("# Heading");
      });

      it("converts starting from a Document root", () => {
        const document = parse(
          "<!DOCTYPE html><html lang='en'><head><title>T</title></head><body><h1>Heading</h1></body></html>",
        );
        expect(toMarkdown(document)).to.equal("# Heading");
      });
    });
  });

  describe("#turndown", () => {
    let turndown, utilModule;

    beforeEach(async () => {
      utilModule = await td.replaceEsm(require.resolve("../../lib/browser/util.js"));
      ({ turndown } = await import("../../lib/browser/turndown.js"));
    });

    afterEach(() => {
      td.reset();
    });

    it("downloads the converted markdown for the given element", () => {
      const document = parse("<body><h1>Heading</h1></body>");
      const heading = document.querySelector("h1");

      turndown(heading, "heading.md");

      expect(utilModule.downloadTextFile).to.have.been.calledWith("heading.md", "# Heading");
    });

    it("resolves a CSS selector against the current document", () => {
      parse("<body><main><h1>Heading</h1></main></body>");

      turndown("main", "main.md");

      expect(utilModule.downloadTextFile).to.have.been.calledWith("main.md", "# Heading");
    });

    it("falls back to the document body when no start element is given", () => {
      parse("<body><p>Body text.</p></body>");

      turndown(undefined, "body.md");

      expect(utilModule.downloadTextFile).to.have.been.calledWith("body.md", "Body text.");
    });
  });
});

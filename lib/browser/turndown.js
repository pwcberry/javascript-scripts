/**
 * Converts an HTML DOM subtree into a Markdown document.
 *
 * The conversion drives a depth-first walk of the DOM with walkHtmlDom(), passing it a
 * "block visitor" that dispatches on tag name (h1-h6, p, ul/ol, blockquote, pre, hr, img).
 * When a block-level element is recognised, the visitor renders it (including its inline
 * descendants: strong/b, em/i, code, a, img, br) and returns `false` so walkHtmlDom prunes
 * that subtree - it has already been fully consumed. Elements with no dedicated handler
 * (body, main, div, section, ...) are left unhandled so the walk continues into their
 * children looking for block-level content.
 */
import { walkHtmlDom } from "./dom-walker.js";
import { downloadFile } from "./util.js";

const HEADING_PATTERN = /^h([1-6])$/;
const LIST_TAG_NAMES = ["ul", "ol"];

const INLINE_VISITORS = {
  strong: (element, exclude) => `**${renderInline(element, exclude)}**`,
  b: (element, exclude) => `**${renderInline(element, exclude)}**`,
  em: (element, exclude) => `_${renderInline(element, exclude)}_`,
  i: (element, exclude) => `_${renderInline(element, exclude)}_`,
  code: element => `\`${element.textContent}\``,
  a: (element, exclude) => `[${renderInline(element, exclude)}](${element.getAttribute("href") ?? ""})`,
  img: element => `![${element.getAttribute("alt") ?? ""}](${element.getAttribute("src") ?? ""})`,
  br: () => "  \n",
};

class MarkdownDocument {
  #blocks = [];

  addBlock(text) {
    if (text !== "") {
      this.#blocks.push(text);
    }
  }

  toString() {
    return this.#blocks.join("\n\n");
  }
}

/**
 * Collapses runs of whitespace (including newlines from source formatting) within a single
 * text node into a single space, matching how a browser would render inline text content.
 * Applied per text node - not to the fully-rendered inline string - so that deliberate
 * markers inserted by INLINE_VISITORS (e.g. the "  \n" hard break for <br>) survive intact.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text.replace(/\s+/g, " ");
}

/**
 * Renders the inline (text-level) Markdown for an element's child nodes: plain text nodes
 * pass through (whitespace-normalized), and known inline elements are dispatched to
 * INLINE_VISITORS.
 *
 * @param {Element} node
 * @param {Node[]} exclude Child nodes to skip, e.g. nested lists already rendered separately.
 * @returns {string}
 */
function renderInline(node, exclude = []) {
  let text = "";

  for (const child of Array.from(node.childNodes)) {
    if (exclude.includes(child)) continue;

    if (child.nodeType === Node.TEXT_NODE) {
      text += normalizeText(child.textContent);
    }
    else if (child.nodeType === Node.ELEMENT_NODE) {
      text += renderInlineElement(child, exclude);
    }
  }

  return text;
}

function renderInlineElement(element, exclude = []) {
  const visit = INLINE_VISITORS[element.tagName.toLowerCase()];
  return visit ? visit(element, exclude) : renderInline(element, exclude);
}

function isListElement(element) {
  return LIST_TAG_NAMES.includes(element.tagName.toLowerCase());
}

/**
 * Renders an ol/ul element as Markdown list lines, recursing into nested lists with
 * two-space indentation per level. Ordered lists number from 1 regardless of a "start"
 * attribute; unordered lists use a "- " marker.
 *
 * @param {Element} listElement
 * @param {number} depth
 * @returns {string}
 */
function renderList(listElement, depth = 0) {
  const ordered = listElement.tagName.toLowerCase() === "ol";
  const indent = "  ".repeat(depth);
  const lines = [];
  let index = 1;

  for (const item of Array.from(listElement.children)) {
    if (item.tagName.toLowerCase() !== "li") continue;

    const nestedLists = Array.from(item.children).filter(isListElement);
    const marker = ordered ? `${index++}. ` : "- ";
    const text = renderInline(item, nestedLists).trim();

    lines.push(`${indent}${marker}${text}`);
    nestedLists.forEach(nested => lines.push(renderList(nested, depth + 1)));
  }

  return lines.join("\n");
}

/**
 * Renders a blockquote by converting its children as a nested Markdown document, then
 * prefixing every resulting line with "> ". Each child is walked independently (rather
 * than walking the blockquote itself) so the blockquote handler below isn't re-entered.
 *
 * @param {Element} blockquoteElement
 * @returns {string}
 */
function renderBlockquote(blockquoteElement) {
  const nested = new MarkdownDocument();
  const visit = createBlockVisitor(nested);

  Array.from(blockquoteElement.children).forEach(child => walkHtmlDom(child, visit));

  return nested
    .toString()
    .split("\n")
    .map(line => (line === "" ? ">" : `> ${line}`))
    .join("\n");
}

/**
 * Renders a pre element as a fenced code block, using the language-* class on a nested
 * <code> element (if present) as the fence's info string.
 *
 * @param {Element} preElement
 * @returns {string}
 */
function renderCodeBlock(preElement) {
  const codeElement = preElement.querySelector("code") ?? preElement;
  const language = /language-(\S+)/.exec(codeElement.className ?? "")?.[1] ?? "";

  return "```" + language + "\n" + codeElement.textContent.replace(/\n$/, "") + "\n```";
}

/**
 * Builds the block-level visitor passed to walkHtmlDom(): a dispatch table keyed on tag
 * name that renders each recognised block element into `doc` and returns `false` to
 * prune its subtree. Unrecognised elements return `undefined` so traversal continues into
 * their children.
 *
 * @param {MarkdownDocument} doc
 * @returns {(element: HTMLElement) => (void|boolean)}
 */
function createBlockVisitor(doc) {
  return function visit(element) {
    const tagName = element.tagName.toLowerCase();
    const headingMatch = HEADING_PATTERN.exec(tagName);

    if (headingMatch) {
      doc.addBlock(`${"#".repeat(Number(headingMatch[1]))} ${renderInline(element).trim()}`);
      return false;
    }

    switch (tagName) {
      case "p":
        doc.addBlock(renderInline(element).trim());
        return false;
      case "blockquote":
        doc.addBlock(renderBlockquote(element));
        return false;
      case "ul":
      case "ol":
        doc.addBlock(renderList(element));
        return false;
      case "pre":
        doc.addBlock(renderCodeBlock(element));
        return false;
      case "hr":
        doc.addBlock("---");
        return false;
      case "img":
        doc.addBlock(renderInlineElement(element));
        return false;
      default:
        return undefined;
    }
  };
}

/**
 * Converts a DOM subtree into a Markdown document string.
 *
 * @param {Element|Document|DocumentFragment} root
 * @returns {string}
 */
function toMarkdown(root) {
  const doc = new MarkdownDocument();
  walkHtmlDom(root, createBlockVisitor(doc));
  return doc.toString();
}

function resolveRoot(startElement) {
  if (typeof startElement === "string") {
    return document.querySelector(startElement);
  }
  if (startElement instanceof Element) {
    return startElement;
  }
  return document.body;
}

function turndown(startElement, filename) {
  const root = resolveRoot(startElement);
  downloadFile(filename, toMarkdown(root));
}

export { turndown, toMarkdown };

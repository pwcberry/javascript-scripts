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
 *
 * Callers may extend or override tag handling via `config.visitors` (see toMarkdown/turndown),
 * without editing this module: `{ block: { tagName: fn }, inline: { tagName: fn } }`. A custom
 * entry replaces the built-in handler for that tag; the `next` helper passed to every visitor
 * calls what the built-in handler would have done, so a custom visitor can wrap rather than
 * fully replace default behaviour.
 */
import { walkHtmlDom } from "./dom-walker.js";
import { downloadFile } from "./util.js";

const LIST_TAG_NAMES = ["ul", "ol"];

/**
 * Built-in inline (text-level) visitors, keyed by lowercase tag name.
 *
 * Signature: (element, exclude, helpers) => string
 *   - exclude: child nodes to skip (see renderInline)
 *   - helpers.renderInline(el = element, excl = exclude): re-enters inline rendering using
 *     the same (possibly custom-merged) visitor table.
 *   - helpers.next(el = element, excl = exclude): invokes the built-in visitor for this tag,
 *     for use by a custom override that wants to extend rather than replace it.
 */
const INLINE_VISITORS = {
  strong: (element, exclude, { renderInline }) => `**${renderInline(element, exclude)}**`,
  b: (element, exclude, { renderInline }) => `**${renderInline(element, exclude)}**`,
  em: (element, exclude, { renderInline }) => `_${renderInline(element, exclude)}_`,
  i: (element, exclude, { renderInline }) => `_${renderInline(element, exclude)}_`,
  code: element => `\`${element.textContent}\``,
  a: (element, exclude, { renderInline }) => `[${renderInline(element, exclude)}](${element.getAttribute("href") ?? ""})`,
  img: element => `![${element.getAttribute("alt") ?? ""}](${element.getAttribute("src") ?? ""})`,
  br: () => "  \n",
};

/**
 * Built-in block-level visitors, keyed by lowercase tag name (h1-h6 included).
 *
 * Signature: (element, helpers) => (string|false|undefined)
 *   - Call `helpers.doc.addBlock(text)` and return `false` to consume the element's subtree.
 *   - Return `undefined` to leave the element unhandled so walkHtmlDom descends into its
 *     children (e.g. a generic container with no dedicated rendering).
 *   - helpers.renderInline/.renderInlineElement/.renderList/.renderBlockquote: re-enter
 *     rendering using the same (possibly custom-merged) visitor tables.
 *   - helpers.next(el = element): invokes the built-in visitor for this tag, for use by a
 *     custom override that wants to extend rather than replace it.
 */
const BLOCK_VISITORS = {
  h1: (element, { doc, renderInline }) => {
    doc.addBlock(`# ${renderInline().trim()}`);
    return false;
  },
  h2: (element, { doc, renderInline }) => {
    doc.addBlock(`## ${renderInline().trim()}`);
    return false;
  },
  h3: (element, { doc, renderInline }) => {
    doc.addBlock(`### ${renderInline().trim()}`);
    return false;
  },
  h4: (element, { doc, renderInline }) => {
    doc.addBlock(`#### ${renderInline().trim()}`);
    return false;
  },
  h5: (element, { doc, renderInline }) => {
    doc.addBlock(`##### ${renderInline().trim()}`);
    return false;
  },
  h6: (element, { doc, renderInline }) => {
    doc.addBlock(`###### ${renderInline().trim()}`);
    return false;
  },
  p: (element, { doc, renderInline }) => {
    doc.addBlock(renderInline().trim());
    return false;
  },
  blockquote: (element, { doc, renderBlockquote }) => {
    doc.addBlock(renderBlockquote());
    return false;
  },
  ul: (element, { doc, renderList }) => {
    doc.addBlock(renderList());
    return false;
  },
  ol: (element, { doc, renderList }) => {
    doc.addBlock(renderList());
    return false;
  },
  pre: (element, { doc }) => {
    doc.addBlock(renderCodeBlock(element));
    return false;
  },
  hr: (element, { doc }) => {
    doc.addBlock("---");
    return false;
  },
  img: (element, { doc, renderInlineElement }) => {
    doc.addBlock(renderInlineElement());
    return false;
  },
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
 * `inlineVisitors`.
 *
 * @param {Element} node
 * @param {Node[]} exclude Child nodes to skip, e.g. nested lists already rendered separately.
 * @param {Object.<string, Function>} inlineVisitors
 * @returns {string}
 */
function renderInline(node, exclude = [], inlineVisitors = INLINE_VISITORS) {
  let text = "";

  for (const child of Array.from(node.childNodes)) {
    if (exclude.includes(child)) continue;

    if (child.nodeType === Node.TEXT_NODE) {
      text += normalizeText(child.textContent);
    }
    else if (child.nodeType === Node.ELEMENT_NODE) {
      text += renderInlineElement(child, exclude, inlineVisitors);
    }
  }

  return text;
}

function renderInlineElement(element, exclude = [], inlineVisitors = INLINE_VISITORS) {
  const tagName = element.tagName.toLowerCase();
  const visit = inlineVisitors[tagName];

  if (!visit) return renderInline(element, exclude, inlineVisitors);

  const helpers = {
    renderInline: (el = element, excl = exclude) => renderInline(el, excl, inlineVisitors),
    next: (el = element, excl = exclude) => {
      const defaultVisit = INLINE_VISITORS[tagName];
      return defaultVisit ? defaultVisit(el, excl, helpers) : renderInline(el, excl, inlineVisitors);
    },
  };

  return visit(element, exclude, helpers);
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
 * @param {Object.<string, Function>} inlineVisitors
 * @returns {string}
 */
function renderList(listElement, depth = 0, inlineVisitors = INLINE_VISITORS) {
  const ordered = listElement.tagName.toLowerCase() === "ol";
  const indent = "  ".repeat(depth);
  const lines = [];
  let index = 1;

  for (const item of Array.from(listElement.children)) {
    if (item.tagName.toLowerCase() !== "li") continue;

    const nestedLists = Array.from(item.children).filter(isListElement);
    const marker = ordered ? `${index++}. ` : "- ";
    const text = renderInline(item, nestedLists, inlineVisitors).trim();

    lines.push(`${indent}${marker}${text}`);
    nestedLists.forEach(nested => lines.push(renderList(nested, depth + 1, inlineVisitors)));
  }

  return lines.join("\n");
}

/**
 * Renders a blockquote by converting its children as a nested Markdown document, then
 * prefixing every resulting line with "> ". Each child is walked independently (rather
 * than walking the blockquote itself) so the blockquote handler below isn't re-entered.
 *
 * @param {Element} blockquoteElement
 * @param {Object.<string, Function>} blockVisitors
 * @param {Object.<string, Function>} inlineVisitors
 * @returns {string}
 */
function renderBlockquote(blockquoteElement, blockVisitors = BLOCK_VISITORS, inlineVisitors = INLINE_VISITORS) {
  const nested = new MarkdownDocument();
  const visit = createBlockVisitor(nested, blockVisitors, inlineVisitors);

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
 * @param {Object.<string, Function>} blockVisitors
 * @param {Object.<string, Function>} inlineVisitors
 * @returns {(element: HTMLElement) => (void|boolean)}
 */
function createBlockVisitor(doc, blockVisitors = BLOCK_VISITORS, inlineVisitors = INLINE_VISITORS) {
  return function visit(element) {
    const tagName = element.tagName.toLowerCase();
    const visitBlock = blockVisitors[tagName];

    if (!visitBlock) return undefined;

    const helpers = {
      doc,
      renderInline: (el = element, excl = []) => renderInline(el, excl, inlineVisitors),
      renderInlineElement: (el = element, excl = []) => renderInlineElement(el, excl, inlineVisitors),
      renderList: (el = element, depth = 0) => renderList(el, depth, inlineVisitors),
      renderBlockquote: (el = element) => renderBlockquote(el, blockVisitors, inlineVisitors),
      next: (el = element) => {
        const defaultVisit = BLOCK_VISITORS[tagName];
        return defaultVisit ? defaultVisit(el, helpers) : undefined;
      },
    };

    return visitBlock(element, helpers);
  };
}

/**
 * Converts a DOM subtree into a Markdown document string.
 *
 * @param {Element|Document|DocumentFragment} root
 * @param {Object} [config]
 * @param {Object} [config.visitors] Custom tag handlers merged over the built-ins.
 * @param {Object.<string, Function>} [config.visitors.block] Block-level visitors, keyed by
 *   lowercase tag name (h1-h6, p, ul, ol, blockquote, pre, hr, img, or any new tag). See
 *   BLOCK_VISITORS above for the visitor signature.
 * @param {Object.<string, Function>} [config.visitors.inline] Inline visitors, keyed by
 *   lowercase tag name (strong, b, em, i, code, a, img, br, or any new tag). See
 *   INLINE_VISITORS above for the visitor signature.
 * @returns {string}
 */
function toMarkdown(root, config = {}) {
  const blockVisitors = { ...BLOCK_VISITORS, ...config.visitors?.block };
  const inlineVisitors = { ...INLINE_VISITORS, ...config.visitors?.inline };
  const doc = new MarkdownDocument();

  walkHtmlDom(root, createBlockVisitor(doc, blockVisitors, inlineVisitors));

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

/**
 * @param {Element|string} startElement
 * @param {string} filename
 * @param {Object} [config] See toMarkdown() for `config.visitors`.
 */
function turndown(startElement, filename, config = {}) {
  const root = resolveRoot(startElement);
  downloadFile(filename, toMarkdown(root, config));
}

export { turndown, toMarkdown };

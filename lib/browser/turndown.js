import { downloadFile } from "../util.js";

class Document {
    #blocks = [];

    addBlock(block) {
        this.#blocks.push(block);
    }

    get document() {
        return this.#blocks.join("\n");
    }
}

class Collector extends Document {
    #currentBlock = [];
    #start = null;

    constructor(startElement) {
        super();

        if (typeof startElement === "string") {
            this.#start = document.querySelector(startElement);
        } else if (startElement instanceof Node) {
            this.#start = startElement ?? document.body;
        }
    }

    traverse(element = null) {
        const toInspect = element ?? this.#start;
        if (toInspect.dataset?.visited !== "true") {
            this.tagElement(toInspect);
        }
    }

    addDocumentBlock() {
        this.addBlock(this.#currentBlock.join(""));
        this.#currentBlock = [];
    }

    tagElement(element) {
        element.dataset.visited = "true";
    }
}

const BLOCK_ELEMENTS = /h(\d)|p|img|table|ul|ol|blockquote/;
const INLINE_ELEMENTS = /a|img|strong|em|i|b|code|li/;

function normalizeTextArray(array) {
    return array.join(" ").replace(/\s{2,}/g, " ");
}

function convertImage(node) {
    const { alt, src } = node;
    return `![${alt ?? "image"}](${src})`;
}

function convertLink(node) {
    const { href, textContent } = node;
    return `[${textContent}](${href})`;
}

function convertCode(node) {
    return "`" + normalizeTextArray(parseInlineElements([], node)) + "`";
}

function convertStrong(node) {
    return `**${normalizeTextArray(parseInlineElements([], node))}**`;
}

function convertEmphasis(node) {
    return `_${normalizeTextArray(parseInlineElements([], node))}_`;
}

function parseInlineElements(collector, node) {
    const added = [];
    const nodeName = node.tagName.toLowerCase();

    const inlineLevelMatch = INLINE_ELEMENTS.exec(nodeName);
    if (inlineLevelMatch) {
        const tagName = inlineLevelMatch[0].at(0).toLowerCase();
        switch (tagName) {
            case "a":
                added.push(convertLink(node));
                break;
            case "code":
                added.push(convertCode(node));
                break;
            case "strong":
            case "b":
                added.push(convertStrong(node));
                break;
            case "em":
            case "i":
                added.push(convertEmphasis(node));
                break;
            case "img":
                added.push(convertImage(node));
                break;
        }
    }

    return added.length > 0 ? [...collector, ...added] : collector;
}

function convertParagraph(node) {
    return normalizeTextArray(parseInlineElements([], node));
}

function convertHeading(node, depth) {
    return `${"#".repeat(depth)} ${node.textContent.trim()}\n`;
}

function parseBlockElement(collector, node) {
    const added = [];
    const nodeName = node.tagName.toLowerCase();

    const blockLevelMatch = BLOCK_ELEMENTS.exec(nodeName);
    if (blockLevelMatch) {
        const tagName = blockLevelMatch[0].at(0).toLowerCase();
        switch (tagName) {
            case "h":
                added.push(convertHeading(node, parseInt(blockLevelMatch[1])));
                break;
            case "p":
                added.push(convertParagraph(node));
                break;
            case "img":
                added.push(convertImage(node));
                break;
        }
    } else if (node.hasChildren) {
        for (let element of Array.from(node.children)) {
            added.push(...parseBlockElement(added, element));
        }
    }
    return added.length > 0 ? [...collector, ...added] : collector;
}

function visitInlineElement(collector, element) {}

function visitBlockElement(collector, element) {}

function parseElement(collector, element) {
    // visitBlockElement(collector, element);

    return collector;
}

function turndown(startElement, filename) {
    // TODO: Add check that the startElement is an element, otherwise start on the document body
    // TODO: This solution should be based on "depth-first" search

    const collector = new Collector(startElement);
    // parseElement(collector, startElement);
    downloadFile(filename, collector.document);
}

export { turndown, Collector };

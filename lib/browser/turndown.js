import { downloadFile } from "../util.js";

const BLOCK_ELEMENTS = /h(\d)|p|img|table|ul|ol|blockquote/i;
const INLINE_ELEMENTS = /a|img|strong|em|i|b|code|li/i;
const MARKDOWN_FORMAT = {
    p: "",
    h1: "# ",
    h2: "## ",
    h3: "### ",
    h4: "#### ",
    h5: "##### ",
    blockquote: "> ",
    li: "- ",
    b: "**",
    strong: "**",
    i: "_",
    em: "_",
    code: "`",
    br: "  \n",
};

class Document {
    #blocks = [];

    get content() {
        return this.#blocks.join("");
    }

    addBlock(block) {
        this.#blocks.push(block);
    }
}

class Collector extends Document {
    #currentBlock = [];
    #currentInline = [];
    #start = null;

    constructor(startElement) {
        super();

        if (typeof startElement === "string") {
            this.#start = document.querySelector(startElement);
        } else if (startElement instanceof Element) {
            this.#start = startElement ?? document.body;
        }
    }

    traverse(element) {
        if (element !== null && element.dataset?.visited !== "true") {
            if (BLOCK_ELEMENTS.test(element.tagName)) {
                this.extractBlock(element);
                this.addDocumentBlock();
            } else {
                this.traverse(element.firstElementChild);
            }
            this.tagElement(element);
            this.traverse(element.nextElementSibling);
        }
    }

    extractInline(element) {
        const markdownFormat = MARKDOWN_FORMAT[element.tagName.toLowerCase()] ?? "";
        if (markdownFormat !== "") {
            this.#currentBlock.push(markdownFormat);
            this.#currentInline.push(markdownFormat);
        }

        for (let node of Array.from(element.childNodes)) {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    this.#currentBlock.push(node.textContent);
                    break;
                case Node.ELEMENT_NODE:
                    this.extractInline(node);
                    this.tagElement(node);
                    break;
            }
        }

        const markdownClosure = this.#currentInline.pop();
        if (typeof markdownClosure === "string") {
            this.#currentBlock.push(markdownClosure);
        }
    }

    extractBlock(element) {
        const markdownFormat = MARKDOWN_FORMAT[element.tagName.toLowerCase()] ?? "";
        if (markdownFormat !== "") {
            this.#currentBlock.push(markdownFormat);
        }

        for (let node of Array.from(element.childNodes)) {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    this.#currentBlock.push(node.textContent);
                    break;
                case Node.ELEMENT_NODE:
                    this.extractInline(node);
                    this.tagElement(node);
                    break;
            }
        }
    }

    collect() {
        this.traverse(this.#start);
    }

    addDocumentBlock() {
        this.addBlock(`${this.#currentBlock.join("")}\n\n`);
        this.#currentBlock = [];
    }

    tagElement(element) {
        element.dataset.visited = "true";
    }
}

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
    // collector.start();
    // parseElement(collector, startElement);
    downloadFile(filename, collector.content);
}

export { turndown, Collector };

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

class Stack {
    #items = [];
    #last = null;
    #size = 0;

    push(item) {
        this.#items.push(item);
        this.#last = item;
        this.#size++;
    }

    pop() {
        const item = this.#items.pop();
        this.#size--;

        if (this.#size > 0) {
            this.#last = this.#items[this.#size - 1];
        }

        return item;
    }

    get last() {
        return this.#last;
    }

    get size() {
        return this.#size;
    }

    [Symbol.iterator]() {
        const items = this.#items;
        const size = this.#size;
        return {
            index: 0,
            next() {
                const done = this.index === size;
                return { done, value: items[this.index++] };
            },
        };
    }
}

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
    #blocks = new Stack();
    #inline = new Stack();
    #lists = new Stack();
    #start = null;

    constructor(startElement) {
        super();

        if (typeof startElement === "string") {
            this.#start = document.querySelector(startElement);
        } else if (startElement instanceof Element) {
            this.#start = startElement ?? document.body;
        }
    }

    /**
     * Extract the inline content of the parent element.
     *
     * @param element
     */
    #extractInline(element) {
        const tagName = element.tagName.toLowerCase();
        const markdownFormat = MARKDOWN_FORMAT[tagName] ?? "";
        if (markdownFormat !== "") {
            this.#blocks.push(markdownFormat);
            this.#inline.push(markdownFormat);
        }

        for (let node of Array.from(element.childNodes)) {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    this.#blocks.push(node.textContent);
                    break;
                case Node.ELEMENT_NODE:
                    this.#extractInline(node);
                    this.tagElement(node);
                    break;
            }
        }

        const markdownClosure = this.#inline.pop();
        if (typeof markdownClosure === "string") {
            this.#blocks.push(markdownClosure);
        }
    }

    /**
     * Determine the strategy to extract the content from the element's
     * descendents.
     *
     * @param element {Element}
     */
    #extractBlock(element) {
        const tagName = element.tagName.toLowerCase();
        let markdownFormat = MARKDOWN_FORMAT[tagName] ?? "";

        // TODO: Determine the extraction strategy for the given tag name

        switch (tagName) {
            case "p":
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
                this.#inline.push(markdownFormat);
                break;
            case "ul":
                this.#lists.push(["ul"]);
                // TODO: traverse list
                break;
            case "ol":
                this.#lists.push(["ol", 1]);
                // TODO: traverse list
                break;
            case "li":
                if (this.#lists.last[0] === "ol") {
                    markdownFormat = `${this.#lists.last[1]++}. `;
                }
                this.#inline.push(markdownFormat);
                break;
        }
    }

    #addInlineToBlock() {
        const [tagName] = this.#blocks.last;

        let s = "";
        while (this.#inline.size > 0) {
            s += this.#inline.pop();
        }

        if (BLOCK_ELEMENTS.test(tagName)) {
            s += "\n";
        }

        this.#blocks.last[1] = s;
    }

    #addDocumentBlock() {
        while (this.#blocks.size > 0) {
            let [tagName, block] = this.#blocks.pop();
            this.addBlock(block + BLOCK_ELEMENTS.test(tagName) ? "\n" : "");
        }
    }

    collect() {
        this.traverse(this.#start);
    }

    traverse(element) {
        if (element !== null && element.dataset?.visited !== "true") {
            if (BLOCK_ELEMENTS.test(element.tagName)) {
                this.#extractBlock(element);
                this.#addDocumentBlock();
            } else {
                this.traverse(element.firstElementChild);
            }
            this.tagElement(element);
            this.traverse(element.nextElementSibling);
        }
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

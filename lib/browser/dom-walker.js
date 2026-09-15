/**
 * Walks an HTML DOM subtree and executes a visitor for each HTMLElement encountered.
 *
 * Entry point:
 *   walkHtmlDom(root, visitor)
 *
 * @param {HTMLElement|Document|DocumentFragment} root
 *   Root element to start traversal from.
 * @param {(element: HTMLElement) => (void|boolean)} visitor
 *   Called once for each HTMLElement in depth-first pre-order.
 *   Return `false` to skip traversing that element's descendants.
 *
 * @throws {TypeError} If root is not an HTMLElement, a Document, or a DocumentFragment or visitor is not a function.
 */
function walkHtmlDom(root, visitor) {
  if (typeof visitor !== "function") {
    throw new TypeError("walkHtmlDom: \"visitor\" must be a function.");
  }

  if (!isTraversable(root)) {
    throw new TypeError(
      "walkHtmlDom: \"root\" must be an HTMLElement, a Document, or a DocumentFragment.",
    );
  }

  // Iterative DFS to avoid call stack limits on deep trees.
  /** @type {HTMLElement[]} */
  const stack = [];

  // Seed stack with root element(s), handling non-HTMLElement roots (Document/Fragment/etc.)
  if (isElement(root)) {
    stack.push(root);
  }
  else {
    pushElementChildrenReverse(root, stack);
  }

  while (stack.length > 0) {
    const el = stack.pop();

    // Execute visitor; false means "prune this subtree"
    if (visitor(el) === false) continue;

    // Push children in reverse so traversal remains left-to-right pre-order.
    pushElementChildrenReverse(el, stack);
  }
}

/**
 * Pushes only ELEMENT_NODE children onto stack in reverse sibling order.
 * This preserves natural document order when popping from stack.
 *
 * @param {HTMLElement} parent
 * @param {HTMLElement[]} stack
 */
function pushElementChildrenReverse(parent, stack) {
  // HTMLElement, Document, and DocumentFragment all have .children, but Node does not
  if (isTraversable(parent)) {
    Array.from(parent.children).reverse().forEach(element => stack.push(element));
  }
}

/**
 * Returns true if the node is an HTMLElement, false otherwise.
 * @param {Node} value
 * @returns {boolean}
 */
function isElement(value) {
  return value instanceof HTMLElement;
}

/**
 * Determines if the node is a valid traversable element (Document, DocumentFragment, or HTMLElement).
 * @param {Node} value
 * @returns {boolean}
 */
function isTraversable(value) {
  return (
    value instanceof Document
    || value instanceof DocumentFragment
    || value instanceof HTMLElement
  );
}

export {
  walkHtmlDom,
};

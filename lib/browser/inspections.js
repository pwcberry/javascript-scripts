/**
 * Returns all elements in the DOM that are targets of CSS animations
 * (not CSS transitions).
 * @example
 * // Default: document as the target and only elements with currently running animations
 * `const animated = findAnimationTargets();`
 *
 * @example
 * // Include elements with declared-but-idle animations
 * `const declared = findAnimationTargets(document, { includeDeclared: true });`
 *
 * @param {ParentNode} [root=document] - Root to search from.
 * @param {Object} [options]
 * @param {boolean} [options.includePseudo=true] - Include elements whose
 *   ::before/::after/::marker pseudo-elements are animated.
 * @param {boolean} [options.includeDeclared=false] - Also include elements whose
 *   computed style declares an animation-name, even if not currently running
 *   (e.g. paused at delay, finished with no fill, or animation-play-state: paused).
 * @returns {Element[]}
 */
function findAnimationTargets(root = document, options = {}) {
  const { includePseudo = true, includeDeclared = false } = options;
  const targets = new Set();

  // 1. Web Animations API: getAnimations() returns both CSSAnimation and
  //    CSSTransition objects, so filter by constructor.
  if (typeof document.getAnimations === "function") {
    const scope = root === document ? document : root;
    const animations = typeof scope.getAnimations === "function"
      ? scope.getAnimations({ subtree: true })
      : document.getAnimations();

    for (const anim of animations) {
      // Exclude CSSTransition and script-created Animation objects.
      if (typeof CSSAnimation !== "undefined" && !(anim instanceof CSSAnimation)) {
        continue;
      }
      const target = anim.effect && anim.effect.target;
      if (!target) continue;
      // Pseudo-element animations still report the originating element as target.
      if (!includePseudo && anim.effect.pseudoElement) continue;
      if (root === document || root.contains(target)) targets.add(target);
    }
  }

  // 2. Optional: elements that declare an animation-name in computed style,
  //    regardless of whether the animation is currently running.
  if (includeDeclared) {
    const all = root.querySelectorAll("*");
    const hasAnimation = (style) => {
      const names = style.animationName;
      return names && names !== "none" && names.split(",").some(n => n.trim() !== "none");
    };
    for (const el of all) {
      if (hasAnimation(getComputedStyle(el))) {
        targets.add(el);
        continue;
      }
      if (includePseudo) {
        for (const pseudo of ["::before", "::after", "::marker"]) {
          if (hasAnimation(getComputedStyle(el, pseudo))) {
            targets.add(el);
            break;
          }
        }
      }
    }
  }

  return [...targets];
}

export {
  findAnimationTargets,
};

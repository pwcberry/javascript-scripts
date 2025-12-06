/**
 * @fileoverview Isomorphic Math utilities.
 */

const getRndInt = (min, max) => min + Math.floor(Math.random() * (max - min));
const getRange = function* (start, end) {
    for (let i = start; i <= end; i += 1) {
        yield i;
    }
};

export { getRndInt, getRange };

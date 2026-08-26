/**
 * This file is the result of some thoughts about code quality
 * and how functional thinking can ensure better comprehensibility.
 * It is not a library, but rather a demonstration of how to write
 * clean and maintainable code.
 */
import process from "node:process";

/**
 * Computes the percentage based on the given age.
 * Returns the computed percentage if the age is a valid number,
 * otherwise returns negative infinity.
 * @param age {number} The member's age
 * @returns {number} The computed percentage or negative infinity if the age is invalid
 */
function computePercentage(age) {
  if (typeof age === "number" && !Number.isNaN(age)) {
    return Math.min(70, Math.max(age - 30) * 2);
  }
  return Number.NEGATIVE_INFINITY;
}

/**
 * Returns a copy of the items array with the item containing "abc"
 * replaced by a percentage string based on the age.
 * @param items {string[]} The array of items to check for the "abc" substring
 * @param age {number} The member's age
 * @returns {string[]} The copy of the array
 */
function replaceItemWithPercentage(items = [], age) {
  /** @type {function(string, number?): string} */
  let transformer = a => a;
  const percentage = computePercentage(age);
  const matchedIndex = items.findIndex(item => item.toLowerCase().includes("abc"));

  if (percentage >= 0 && matchedIndex > -1) {
    const itemToReplace = items[matchedIndex].toUpperCase();
    const replacementItem = percentage > 0 ? `${percentage}% ${itemToReplace}` : `0% ${itemToReplace}`;
    transformer = (item, index) => index === matchedIndex ? replacementItem : item;
  }
  return items.map(transformer);
}

function main(args) {
  const age = Number(args[0]);
  const items = args.slice(1);
  const transformedItems = replaceItemWithPercentage(items, age);
  console.log("age:        ", age);
  console.log("items:      ", items);
  console.log("transformed:", transformedItems);
}

main(process.argv.slice(2));

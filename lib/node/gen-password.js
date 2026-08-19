import crypto from "node:crypto";
import process from "node:process";

// Character set matches Chrome's generated-password style:
// lowercase, uppercase, digits, and a small set of symbols.
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "-_.,!@#$%^&*+=?";

const ALL_CHARS = LOWER + UPPER + DIGITS + SYMBOLS;

/**
 * Generates a cryptographically secure password similar in style to the
 * ones Google Chrome suggests (mixed-case letters, digits, and symbols).
 *
 * @param {number} [minLength=15] - Minimum password length.
 * @param {number} [maxLength=15] - Maximum password length.
 * @returns {string} The generated password.
 */
function generatePassword(minLength = 15, maxLength = 15) {
  if (!Number.isInteger(minLength) || !Number.isInteger(maxLength)) {
    throw new TypeError("minLength and maxLength must be integers");
  }
  if (minLength < 4) {
    throw new RangeError("minLength must be at least 4 to guarantee character variety");
  }
  if (maxLength < minLength) {
    throw new RangeError("maxLength must be greater than or equal to minLength");
  }

  const length = minLength === maxLength ? minLength : crypto.randomInt(minLength, maxLength + 1);

  // Guarantee at least one character from each category, then fill the
  // rest randomly, then shuffle so the guaranteed characters aren't
  // predictably placed at the start.
  const requiredChars = [
    LOWER[crypto.randomInt(LOWER.length)],
    UPPER[crypto.randomInt(UPPER.length)],
    DIGITS[crypto.randomInt(DIGITS.length)],
    SYMBOLS[crypto.randomInt(SYMBOLS.length)],
  ];

  const remainingLength = length - requiredChars.length;
  const remainingChars = Array.from({ length: remainingLength }, () => ALL_CHARS[crypto.randomInt(ALL_CHARS.length)]);

  const passwordChars = requiredChars.concat(remainingChars);

  // Fisher-Yates shuffle using a secure RNG.
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

function main({ minLength, maxLength }) {
  const [min, max] = [parseInt(minLength), parseInt(maxLength)].map(n => (Number.isNaN(n) ? undefined : n));
  const password = generatePassword(min, max);
  console.log(password);
}

main({
  minLength: process.argv[2],
  maxLength: process.argv[3],
});

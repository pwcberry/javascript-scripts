import crypto from "node:crypto";
import process from "node:process";

const WORDS = [
  "river", "cloud", "stone", "ember", "forest", "shadow", "silver", "thunder",
  "ocean", "falcon", "aurora", "summit", "meadow", "crystal", "blaze", "echo",
  "drift", "mystic", "canyon", "harbor", "lunar", "comet", "willow", "granite",
  "sapphire", "tempest", "cascade", "zephyr", "horizon", "solstice", "twilight",
  "planet", "nebula", "galaxy", "phoenix", "vortex", "serenity", "whisper", "radiant"
];

const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

// Leet map intentionally mild to retain readability
const LEET_MAP = {
  a: ["4", "@"],
  e: ["3"],
  i: ["1"],
  o: ["0"],
  s: ["5", "$"],
  t: ["7"]
};

function randomInt(max) {
  return crypto.randomInt(max);
}

function randomChoice(strOrArray) {
  return strOrArray[randomInt(strOrArray.length)];
}

function capitalize(word) {
  if (!word) {
    return word;
  }
  return word[0].toUpperCase() + word.slice(1);
}

function hasUpper(str) {
  return /[A-Z]/.test(str);
}

function hasLower(str) {
  return /[a-z]/.test(str);
}

function hasDigit(str) {
  return /[0-9]/.test(str);
}

function hasSymbol(str) {
  return /[^A-Za-z0-9]/.test(str);
}

function applyMildLeet(word) {
  // Replace 1–2 eligible letters max, so the word remains recognizable.
  const chars = [...word];
  const eligibleIdx = [];

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i].toLowerCase();
    if (LEET_MAP[c]) eligibleIdx.push(i);
  }

  if (eligibleIdx.length === 0) return word;

  const replacements = Math.min(eligibleIdx.length, randomInt(2) + 1); // 1..2
  const used = new Set();

  for (let r = 0; r < replacements; r++) {
    let idx;
    do {
      idx = eligibleIdx[randomInt(eligibleIdx.length)];
    } while (used.has(idx) && used.size < eligibleIdx.length);

    used.add(idx);
    const original = chars[idx].toLowerCase();
    const replOptions = LEET_MAP[original];
    chars[idx] = randomChoice(replOptions);
  }

  return chars.join("");
}

function fitWordToLength(word, targetLen) {
  // Keep it one-word readable:
  // - If too long: truncate.
  // - If too short: repeat trailing letters from the word itself (not random gibberish).
  if (word.length === targetLen) {
    return word;
  }

  if (word.length > targetLen) {
    return word.slice(0, targetLen);
  }

  let out = word;
  let cursor = 0;
  while (out.length < targetLen) {
    out += word[cursor % word.length];
    cursor++;
  }
  return out;
}

function injectRequiredClasses(baseWord, totalLength) {
  // We'll reserve 2 chars for guaranteed complexity append/prepend:
  // one digit + one symbol (word itself should contain lower/upper).
  // If needed, we force upper/lower inside the word.
  const reserve = 2;
  if (totalLength < 8) {
    throw new Error("Length must be at least 8 for a reasonably complex password.");
  }
  if (totalLength < reserve + 2) {
    throw new Error("Length too short to satisfy complexity requirements.");
  }

  // Build readable core word segment
  let coreLen = totalLength - reserve;
  let w = randomChoice(WORDS);

  // Randomly capitalize first letter for readability
  if (randomInt(2) === 1) {
    w = capitalize(w);
  }

  // Apply mild leet and fit to desired core length
  w = applyMildLeet(w);
  w = fitWordToLength(w, coreLen);

  // Ensure upper/lower in core while preserving readability as much as possible
  let chars = [...w];

  if (!hasUpper(w)) {
    // uppercase first alphabetical letter we can find
    const idx = chars.findIndex((c) => /[a-z]/.test(c));
    if (idx >= 0) {
      chars[idx] = chars[idx].toUpperCase();
    }
  }

  if (!hasLower(chars.join(""))) {
    // lowercase first alphabetical uppercase letter we can find
    const idx = chars.findIndex((c) => /[A-Z]/.test(c));
    if (idx >= 0) {
      chars[idx] = chars[idx].toLowerCase();
    }
  }

  w = chars.join("");

  // Add required digit + symbol without scrambling the whole string,
  // to keep "one word" readability obvious.
  const digit = randomChoice(DIGITS);
  const symbol = randomChoice(SYMBOLS);

  // Random placement pattern that keeps word visible as one chunk
  const patterns = [
    `${w}${digit}${symbol}`,
    `${symbol}${w}${digit}`,
    `${digit}${w}${symbol}`
  ];

  let password = randomChoice(patterns);

  // Final safety checks; if missing a class (rare), patch deterministically.
  if (!hasDigit(password)) {
    password = `${password.slice(0, -1)}${randomChoice(DIGITS)}`;
  }

  if (!hasSymbol(password)) {
    password = `${randomChoice(SYMBOLS)}${password.slice(1)}`;
  }

  if (!hasUpper(password)) {
    password = `${randomChoice(UPPERCASE)}${password.slice(1)}`;
  }

  if (!hasLower(password)) {
    password = `${password.slice(0, -1)}${randomChoice(LOWERCASE)}`;
  }

  return password;
}

function generatePassword(length) {
  if (!Number.isInteger(length)) {
    throw new Error("Length must be an integer.");
  }
  return injectRequiredClasses("", length);
}

function main(arg) {
  if (typeof arg !== "string" || !Number.isInteger(Number(arg))) {
    console.error("Usage: node generate-password.js <length>");
    process.exit(1);
  }

  const length = Number(arg);

  try {
    const password = generatePassword(length);
    console.log(password);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.url === String(new URL(`file://${process.argv[1]}`))) {
  main(process.argv[2]);
}

export { generatePassword };

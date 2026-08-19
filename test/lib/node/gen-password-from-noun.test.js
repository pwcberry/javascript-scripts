import { describe, it } from "mocha";
import { expect } from "chai";
import { generatePassword } from "../../../lib/node/gen-password-from-noun.js";

// Run each property check this many times to account for randomness.
const ITERATIONS = 50;

function repeat(n, fn) {
  for (let i = 0; i < n; i++) fn(i);
}

describe("gen-password-from-noun.js", () => {
  describe("#generatePassword", () => {
    describe("input validation", () => {
      it("throws when length is not an integer", () => {
        expect(() => generatePassword(12.5)).to.throw("Length must be an integer.");
        expect(() => generatePassword("16")).to.throw("Length must be an integer.");
        expect(() => generatePassword(null)).to.throw("Length must be an integer.");
      });

      it("throws when length is less than 8", () => {
        expect(() => generatePassword(7)).to.throw(
          "Length must be at least 8 for a reasonably complex password.",
        );
        expect(() => generatePassword(0)).to.throw(
          "Length must be at least 8 for a reasonably complex password.",
        );
      });
    });

    describe("output length", () => {
      it("returns a string of exactly the requested length (8)", () => {
        repeat(ITERATIONS, () => {
          expect(generatePassword(8)).to.have.lengthOf(8);
        });
      });

      it("returns a string of exactly the requested length (12)", () => {
        repeat(ITERATIONS, () => {
          expect(generatePassword(12)).to.have.lengthOf(12);
        });
      });

      it("returns a string of exactly the requested length (16)", () => {
        repeat(ITERATIONS, () => {
          expect(generatePassword(16)).to.have.lengthOf(16);
        });
      });

      it("returns a string of exactly the requested length (24)", () => {
        repeat(ITERATIONS, () => {
          expect(generatePassword(24)).to.have.lengthOf(24);
        });
      });

      it("returns a string of exactly the requested length (32)", () => {
        repeat(ITERATIONS, () => {
          expect(generatePassword(32)).to.have.lengthOf(32);
        });
      });
    });

    describe("complexity requirements", () => {
      it("always contains at least one uppercase letter", () => {
        repeat(ITERATIONS, (i) => {
          const pw = generatePassword(16);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[A-Z]/);
        });
      });

      it("always contains at least one lowercase letter", () => {
        repeat(ITERATIONS, (i) => {
          const pw = generatePassword(16);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[a-z]/);
        });
      });

      it("always contains at least one digit", () => {
        repeat(ITERATIONS, (i) => {
          const pw = generatePassword(16);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[0-9]/);
        });
      });

      it("always contains at least one symbol", () => {
        repeat(ITERATIONS, (i) => {
          const pw = generatePassword(16);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[^A-Za-z0-9]/);
        });
      });

      it("satisfies all four complexity classes at the minimum length of 8", () => {
        repeat(ITERATIONS, (i) => {
          const pw = generatePassword(8);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[A-Z]/);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[a-z]/);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[0-9]/);
          expect(pw, `iteration ${i}: "${pw}"`).to.match(/[^A-Za-z0-9]/);
        });
      });
    });

    describe("output type", () => {
      it("returns a string", () => {
        expect(generatePassword(12)).to.be.a("string");
      });

      it("returns different passwords on successive calls (non-deterministic)", () => {
        const results = new Set(Array.from({ length: 10 }, () => generatePassword(16)));
        // With a large random space, at least 2 distinct values are expected.
        expect(results.size).to.be.greaterThan(1);
      });
    });
  });
});

import os from "node:os";
import path from "node:path";
import { describe, it } from "mocha";
import { expect } from "chai";
import { resolvePath } from "../../lib/node/file.js";

describe("file.js", () => {
  describe("#resolvePath", () => {
    const home = os.homedir();
    const cwd = process.cwd();

    it("should expand a leading ~ in the base segment to the home directory", () => {
      expect(resolvePath("~/projects")).to.equal(path.join(home, "projects"));
    });

    it("should expand a leading ~ in a subsequent segment", () => {
      expect(resolvePath("/tmp", "~/projects")).to.equal(path.join(home, "projects"));
    });

    it("should treat ~ that is not the first character as a literal", () => {
      expect(resolvePath("/tmp", "foo~bar")).to.equal(path.resolve("/tmp", "foo~bar"));
    });

    it("should return the subsequent absolute segment when the base is also absolute", () => {
      expect(resolvePath("/var/log", "/etc/hosts")).to.equal("/etc/hosts");
    });

    it("should return the subsequent absolute segment as-is, ignoring later segments", () => {
      expect(resolvePath("/var/log", "/etc/hosts", "extra")).to.equal("/etc/hosts");
    });

    it("should return the first subsequent absolute segment when multiple are absolute", () => {
      expect(resolvePath("/a", "/b", "/c")).to.equal("/b");
    });

    it("should resolve relative segments against the base path when the base is absolute", () => {
      expect(resolvePath("/var/log", "app", "error.log")).to.equal(
        path.resolve("/var/log", "app", "error.log"),
      );
    });

    it("should resolve like path.resolve when the base is relative", () => {
      expect(resolvePath("var/log", "/etc/hosts")).to.equal(
        path.resolve("var/log", "/etc/hosts"),
      );
    });

    it("should resolve a relative base against the current working directory", () => {
      expect(resolvePath("var/log", "app")).to.equal(path.resolve(cwd, "var/log", "app"));
    });

    it("should return the resolved base path when no subsequent segments are supplied", () => {
      expect(resolvePath("/var/log")).to.equal(path.resolve("/var/log"));
    });

    it("should expand ~ in the base and combine with a relative segment", () => {
      expect(resolvePath("~/projects", "javascript")).to.equal(
        path.join(home, "projects", "javascript"),
      );
    });

    it("should return the absolute subsequent segment when the base uses ~", () => {
      expect(resolvePath("~/projects", "/etc/hosts")).to.equal("/etc/hosts");
    });
  });
});

import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, it } from "mocha";
import * as td from "testdouble";
import { expect, use } from "chai";
import tdChai from "testdouble-chai";
import { getRndInt } from "../../../lib/isomorphic/math.js";

use(tdChai(td));
const require = createRequire(import.meta.url);

describe("account.js", () => {
    let module, mathLib;
    const girlJson = [
        { name: "Taylor", isClassic: false },
        { name: "Catherine", isClassic: true },
    ];
    const boyJson = [
        { name: "Harry", isClassic: false },
        { name: "Albert", isClassic: true },
    ];
    const familyJson = [
        {
            index: 1,
            name: "Smith",
            proportion: 0.0115,
        },
    ];
    const localityJson = [
        { name: "BRUNSWICK HEADS", state: "NSW", postcode: "2483" },
        { name: "COBURG", state: "VIC", postcode: "3058" },
        { name: "ST KILDA ROAD", state: "VIC", postcode: "8004" },
    ];
    const streetJson = [{ name: "Little Bourke Street" }, { name: "Elizabeth Street" }];

    beforeEach(async () => {
        await td.replaceEsm(require.resolve("../../../data/girls-names.json"), null, girlJson);
        await td.replaceEsm(require.resolve("../../../data/boys-names.json"), null, boyJson);
        await td.replaceEsm(require.resolve("../../../data/family-names.json"), null, familyJson);
        await td.replaceEsm(require.resolve("../../../data/localities.json"), null, localityJson);
        await td.replaceEsm(require.resolve("../../../data/melbourne-streets.json"), null, streetJson);
        mathLib = await td.replaceEsm(require.resolve("../../../lib/isomorphic/math.js"));
        module = await import("../../../lib/node/account.js");
    });

    describe("#generateAccount", () => {
        beforeEach(() => {
            td.when(mathLib.getRndInt(20000000, 40000000)).thenReturn(22233344);
            td.when(mathLib.getRndInt(0, td.matchers.isA(Number))).thenReturn(0);
            td.when(mathLib.getRndInt(0, 10)).thenReturn(9);
            td.when(mathLib.getRndInt(1, 30)).thenReturn(5);
        });

        it("should return an account", () => {
            const account = module.generateAccount();
            expect(mathLib.getRndInt).to.have.been.called;
            expect(account.id).to.equal("22233344");
            expect(account.name).to.equal("Catherine Smith");
            expect(account.address.street).to.equal("5 Elizabeth Street");
            expect(account.address.locality).to.equal("COBURG");
            expect(account.address.state).to.equal("VIC");
            expect(account.address.postcode).to.equal("3058");
        });
    });

    describe("#generateAccountList", () => {
        beforeEach(async () => {
            td.when(mathLib.getRndInt(20000000, 40000000)).thenReturn(22233344);
            td.when(mathLib.getRndInt(0, td.matchers.isA(Number))).thenReturn(0);
            td.when(mathLib.getRndInt(0, 10)).thenReturn(9);
            td.when(mathLib.getRndInt(1, 30)).thenReturn(5);
        });

        it("should generate a list of 5 accounts by default", () => {
            const list = Array.from(module.generateAccountList());
            expect(list.length).to.equal(5);
        });

        it("should generate a list of 10 accounts as specified", () => {
            const list = Array.from(module.generateAccountList(10));
            expect(list.length).to.equal(10);
        });
    });

    afterEach(() => {
        td.reset();
    });
});

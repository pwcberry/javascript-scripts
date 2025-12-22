import familyNames from "../../data/family-names.json" with { type: "json" };
import girlNames from "../../data/girls-names.json" with { type: "json" };
import boyNames from "../../data/boys-names.json" with { type: "json" };
import localities from "../../data/localities.json" with { type: "json" };
import streets from "../../data/melbourne-streets.json" with { type: "json" };
import { getRndInt } from "../isomorphic/math.js";

// List of common English surnames: https://one-name.org/modern-british-surnames/statistics/top-surnames/england-wales/top-500-names/

const getAccId = () => getRndInt(20000000, 40000000).toString();

class Address {
    constructor(street, locality, state, postcode) {
        this.street = street;
        this.locality = locality;
        this.state = state;
        this.postcode = postcode;
    }
}

class Account {
    constructor(id, name, gender, address) {
        this.id = id;
        this.name = name;
        this.gender = gender;
        this.address = address;
    }

    get title() {
        return this.gender === "FEMALE" ? "Ms" : "Mr";
    }

    get salutation() {
        const [, lastName] = this.name.split(" ");
        return `${this.title} ${lastName}`;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            gender: this.gender,
            address: this.address,
            salutation: this.salutation,
        };
    }
}

let vicPlaces = localities.filter((l) => l.state === "VIC" && l.postcode.startsWith("3"));
let onlyStreets = streets.filter((s) => s.name.includes("Street") && !s.name.includes("Little"));
let classicGirls = girlNames.filter((n) => n.isClassic);
let classicBoys = boyNames.filter((n) => n.isClassic);
let selectFamilyNames = familyNames.filter((_, index) => index < 20);

const generateAccount = () => {
    const isGirl = getRndInt(0, 10) >= 5;
    const firstName = isGirl
        ? classicGirls[getRndInt(0, classicGirls.length)].name
        : classicBoys[getRndInt(0, classicBoys.length)].name;
    const familyName = selectFamilyNames[getRndInt(0, selectFamilyNames.length)].name;
    const place = vicPlaces[getRndInt(0, vicPlaces.length)];
    const street = onlyStreets[getRndInt(0, onlyStreets.length)].name;
    return new Account(
        getAccId(),
        `${firstName} ${familyName}`,
        isGirl ? "FEMALE" : "MALE",
        new Address(`${getRndInt(1, 30)} ${street}`, place.name, place.state, place.postcode)
    );
};

const generateAccountList = function* (limit = 5) {
    let count = 0;
    while (count < limit) {
        yield generateAccount();
        count += 1;
    }
};

export { generateAccount, generateAccountList };

import { getRndInt } from "../isomorphic/math.js";

const getAccId = () => getRndInt(20000000, 40000000).toString();

const nameHistory = new Set(); // TODO: Use to avoid duplicates

const generateName = function* () => {
    const firstNames = ["Alicia", "Bronwyn", "Clara", "Diane", "Elizabeth"];
    const lastNames = ["Brown", "Clark", "Davies", "Evans", "Flynn"];
    let notFound = true;

    while(notFound) {
        const newName = firstNames[getRndInt(0, firstNames.length)] + " " + lastNames[getRndInt(0, lastNames.length)];
        if(!nameHistory.has(newName)) {
            nameHistory.add(newName);
            yield newName;
            notFound = false;
        }
    }
}

class Person {
    constructor(id, name, address) {
        this.id = id;
        this.name = name;
        this.address = address;
    }

    static next() {
        const id = getAccId();
        const name = generateName().next().value;

    }
}


// List of common English surnames: https://one-name.org/modern-british-surnames/statistics/top-surnames/england-wales/top-500-names/
const name = {
    first_names: ["Alicia", "Bronwyn", "Clara", "Diane", "Elizabeth"],
    last_names: ["Brown", "Clark", "Davies", "Evans", "Flynn"],
    history: new Set(), // TODO: Use to avoid duplicates
    next() {
        const newName = this.first_names[getRndInt(0, 5)] + " " + this.last_names[getRndInt(0, 5)];
        this.history.add(newName);
        return newName;
    },
};

// TODO: Australian Locality Randomness, see https://github.com/matthewproctor/australianpostcodes
// TODO: Australian Street Address randomness

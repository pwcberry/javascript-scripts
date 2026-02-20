class ComparableSet extends Set {
    constructor(iterable) {
        super(iterable);
    }

    add(item) {
        if (!this.has(item)) {
            super.add(item);
        }
    }

    has(item) {
        if (typeof item !== "undefined") {
            if (typeof item !== "object") {
                return super.has(item);
            }

            if (item !== null) {
                let result = super.has(item);
                if (!result) {
                    for (let [x, _] of this.entries()) {
                        result = this.#isObjectEqual(item, x);
                        if (result) {
                            break;
                        }
                    }
                }
                return result;
            }
        }
        return false;
    }

    #isObjectEqual(o1, o2) {
        const names1 = Object.getOwnPropertyNames(o1);
        const names2 = Object.getOwnPropertyNames(o2);
        if (names1.length !== names2.length) {
            return false;
        }

        let result = true;
        for (const name of names1) {
            if (!names2.includes(name) || o1[name] !== o2[name]) {
                result = false;
                break;
            }
        }

        return result;
    }
}

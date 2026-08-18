function convertToString(v) {
    if (typeof v === "string") {
        return v;
    }

    if (typeof v === "number") {
        return String(v);
    }

    if (v instanceof Date) {
        return v.toISOString();
    }

    return "";
}

function convertToGrid(list, onlyKeys = []) {
    if (!Array.isArray(list) || list.length === 0) {
        return [];
    }

    let headers = Object.keys(list[0]);
    if (Array.isArray(onlyKeys)) {
        headers = headers.filter((h) => onlyKeys.includes(h));
    }
    let columnCount = headers.length;

    const body = list.map((o) => {
        let x = new Array(columnCount);
        for (let i = 0; i < columnCount; i += 1) {
            x[i] = convertToString(o[headers[i]]);
        }
        return x;
    });

    return {
        headers,
        body
    };
}

function convertToCsv(list, onlyKeys = []) {
    let grid = convertToGrid(list, onlyKeys);

    let headers = grid.headers.join(",");
    let body = grid.body.map(r => r.join(",")).join("\n");
    return `${headers}\n${body}`;
}

function getInstanceType(cell) {
    if (cell.childNodes.length > 1) {
        return cell.childNodes[0].textContent.trim();
    }
    return cell.textContent.trim();
}

function mapPerformanceSpec(row) {
    return {
        instanceType: getInstanceType(row.cells[0]),
        memory: parseInt(row.cells[1].textContent),
        processor: row.cells[2].textContent,
        vCPUs: parseInt(row.cells[3].textContent),
        CPUs: parseInt(row.cells[4].textContent),
        threadsPerCore: parseInt(row.cells[5].textContent),
        accelerators: row.cells[6].textContent,
        acceleratorMemory: row.cells[7].textContent,
    };
}

function mapNetworkSpecs(row) {
    return {
        instanceType: getInstanceType(row.cells[0]),
        baseline: row.cells[1].textContent,
        networkCards: parseInt(row.cells[5].textContent),
        maxNetworkInterfaces: parseInt(row.cells[6].textContent),
        ipAddressPerInterface: parseInt(row.cells[7].textContent),
        IPv6: row.cells[8].textContent,
    };
}

function convertToBoolean(cell) {
    // ✗: \u2717
    // ✓: \u2713
    if (cell.childNodes.length === 1) {
        const text = cell.textContent.trim();
        if (text === "\u2717") {
            return false;
        } else if (text === "\u2713") {
            return true;
        }
    }
    return undefined;
}

function mapEbsSpecs(row) {
    return {
        instanceType: getInstanceType(row.cells[0]),
        maxBandwidth: row.cells[1].textContent,
        maxThroughput: row.cells[2].textContent,
        maxIOPS: row.cells[3].textContent,
    };
}

function mapStoreSpecs(row) {
    return {
        instanceType: getInstanceType(row.cells[0]),
        storeVolumes: row.cells[1].textContent,
        storeType: row.cells[2].textContent,
        randomIOPs: row.cells[3].textContent,
        trimSupport: convertToBoolean(row.cells[5]),
    };
}

function mapSecuritySpecs(row) {
    return {
        instanceType: getInstanceType(row.cells[0]),
        ebsEncryption: convertToBoolean(row.cells[1]),
        instanceStoreEncryption: row.cells[2].textContent,
        encryptionInTransit: convertToBoolean(row.cells[3]),
        nitroTPM: convertToBoolean(row.cells[5]),
        nitroEnclaves: convertToBoolean(row.cells[6]),
    };
}

function parseSpecTable(table, mapFn) {
    return Array.from(table.tBodies[0].rows).reduce((coll, row) => {
        if (row.cells.length > 1) {
            coll.push(mapFn(row));
        }
        return coll;
    }, []);
}

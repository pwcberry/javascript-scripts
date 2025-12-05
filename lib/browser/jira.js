/**
 * Scripts to help extract information from Jira.
 */

/**
 * Download a tab-separated file that contains the current work item's child items.
 * @param filename {String} The filename to use for the download.
 */
function downloadChildItems(filename) {
    const tbl = document.querySelector("table[aria-label='Work']");
    const rows = tbl?.tBodies[0].rows ?? [];
    const items = Array.from(rows).map((r) => {
        const img = r.cells[0].querySelector("img");
        const type = img.alt;
        const code = r.cells[0].querySelector("a[data-testid$='issue-key-cell']").textContent;
        const summary = r.cells[0].querySelector("a[data-testid$='issue-summary-cell']").textContent;
        const href = r.cells[0].querySelector("a[data-testid$='issue-summary-cell']").href;
        const estimate = parseInt(
            r.cells[2].querySelector("span[data-testid$='story-point-estimate.badge']")?.textContent ?? "0"
        );
        return [type, code, summary, estimate, href];
    });

    const data = [["Type", "Code", "Summary", "Estimate", "Link"].join("\t")];
    data.push(items.map((i) => i.join("\t")));

    const blob = new Blob([data.join("\n")], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);

    // Create a temporary link to invoke download
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
}

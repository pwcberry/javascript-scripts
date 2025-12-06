/**
 * Download a text file generated in the browser.
 *
 * @param filename {string} The name to download the file as
 * @param data {string} The string data to use for the blob
 */
export function downloadFile(filename, data = "") {
    const blob = new Blob([data], { type: "text/plain" });
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

function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
}

async function collectSlides(container, slidePrefix) {
    /** @type {HTMLImageElement[]} */
    const slides = Array.from(container.querySelectorAll("img"));
    const data = slides.map((slide, index) => {
        const ext = /\.(\w+)$/.exec(slide.src)[1];
        return {
            name: `${slidePrefix}-${index.toString().padStart(3, "0")}.${ext}`,
            url: slide.src,
        };
    });
    downloadJson(data, `${slidePrefix}.json`);
}

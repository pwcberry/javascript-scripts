import { open } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Buffer } from "node:buffer";

/**
 * @typedef {Object} Slide
 * @property {string} url
 * @property {ArrayBuffer} data
 */

/**
 * Download the slide image with the give URL.
 * @param {string} url
 * @return {Promise<Slide | null>}
 */
async function downloadSlide(url) {
    const req = new Request(url, {
        headers: new Headers([
            ["referer", "https://www.slideshare.net/"],
            ["accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"],
            ["accept-encoding", "gzip, deflate, br, zstd"],
            ["accept-language", "en-GB,en-US;q=0.9,en;q=0.8"],
            ["sec-ch-ua", 'Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"'],
            ["sec-ch-ua-mobile", "?0"],
            ["sec-ch-ua-platform", "macOS"],
            ["sec-fetch-dest", "image"],
            ["sec-fetch-mode", "no-cors"],
            ["sec-fetch-site", "cross-site"],
            ["sec-fetch-storage-access", "active"],
            [
                "user-agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            ],
        ]),
    });

    let image = null;
    try {
        const response = await fetch(req);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        image = {
            contentType: response.headers.get("content-type"),
            data: Buffer.from(arrayBuffer),
        };
    } catch (e) {
        console.error(e);
    }
    return image;
}

async function saveImage(filename, data) {
    const handle = await open(filename, "w");
    await handle.write(data, 0);
    await handle.close();
}

async function loadJson(filename) {
    const handle = await open(filename, "r");
    const data = await handle.readFile();
    await handle.close();
    return JSON.parse(data);
}

async function main(slidePrefix, sourcePath) {
    const slides = await loadJson(resolve(import.meta.dirname, sourcePath));
    const destDir = resolve(import.meta.dirname, "../../data/slides");

    for (let i = 2, count = slides.length; i < count; i += 1) {
        console.log("Downloading slide:", slides[i].name);
        const image = await downloadSlide(slides[i].url);

        if (image !== null) {
            const ext = image.contentType === "image/webp" ? "webp" : "jpg";
            const filepath = join(destDir, slides[i].name.replace(".jpg", `.${ext}`));
            await saveImage(filepath, image.data);
            console.log("> Saved.");
        }
    }
}

await main("analysing-deciding-doing", "../../data/analysing-deciding-doing.json");

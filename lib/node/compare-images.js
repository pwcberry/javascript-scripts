import { open, readdir } from "node:fs/promises";
import { dirname, extname, join, parse } from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import sharp from "sharp";
import { checkDirExists, resolvePath } from "./file.js";
import { getTimestamp } from "./util.js";

/**
 * Parse incoming arguments.
 */
function parseArgs(argv) {
    const args = {
        source: null,
        target: null,
        threshold: 0.1, // difference score 0–1; below this = "similar"
        output: null,
        help: false,
        failFast: false,
    };

    for (let i = 2; i < argv.length; i++) {
        switch (argv[i]) {
            case "--source":
            case "-s":
                args.source = argv[++i];
                break;
            case "--target":
            case "-t":
                args.target = argv[++i];
                break;
            case "--threshold":
            case "-T":
                args.threshold = parseFloat(argv[++i]);
                break;
            case "--output":
            case "-o":
                args.output = argv[++i];
                break;
            case "--fail-fast":
            case "--failfast":
            case "-F":
                args.failFast = true;
                break;
            case "--help":
            case "-h":
            case "-?":
                args.help = true;
                break;
            default:
                console.warn(`⚠️  Unknown argument: ${argv[i]}`);
        }
    }

    return args;
}

function printHelp() {
    console.log(`
Image Folder Comparison Tool

Usage:
  node compare-images.js --source <path> --target <path> --output <path> [options]

Options:
  --source    <path>   Folder containing source images (required)
  --target    <path>   Folder containing target images (required)
  --threshold <0–1>    Max allowed diff score to be "similar" (default: 0.1)
                       0 = pixel-perfect, 1 = accept any difference
  --output    <path>   Folder to write report to
  --fast-fail          Switch to stop comparison when similarity is low
  --help               Show this help

Supported formats: JPEG, PNG
`);
}

const createHash = (data) => crypto.createHash("md5").update(data).digest("hex");

// File helpers
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

async function getImageFiles(dir) {
    const imageDir = resolvePath(dir);
    const dirExists = await checkDirExists(imageDir);

    if (!dirExists) {
        throw new Error(`Directory not found: ${dir}`);
    }

    const files = await readdir(imageDir);
    return files
        .filter((f) => EXTENSIONS.has(extname(f).toLowerCase()))
        .sort()
        .map((f) => join(dir, f));
}

/**
 * Main comparison function.
 * @param srcPath {string}
 * @param tgtPath {string}
 * @param threshold {number}
 */
async function compareImages(srcPath, tgtPath, threshold) {
    let srcImg, tgtImg;
    try {
        srcImg = await sharp(srcPath).toBuffer({ resolveWithObject: true });
    } catch (e) {
        throw new Error(`Cannot read source image: ${srcPath} (${e.message})`);
    }
    try {
        const {width, height} = srcImg.info;
        tgtImg = await sharp(tgtPath)
            .resize(width, height, { fit: "cover", kernel:"nearest" })
            .toBuffer({ resolveWithObject: true });
    } catch (e) {
        throw new Error(`Cannot read target image: ${tgtPath} (${e.message})`);
    }

    // Use ImageData interface
    const sourceImage = {
        width: srcImg.info.width,
        height: srcImg.info.height,
        data: new Uint8ClampedArray(srcImg.data),
    };
    const targetImage = {
        width: tgtImg.info.width,
        height: tgtImg.info.height,
        data: new Uint8ClampedArray(tgtImg.data),
    };

    // TODO: Create a tool that derives the difference between two images, no matter the pixel density.
    // TODO: Pixelmator, Resemble.js, blink-diff are examples of JavaScript implementations

    return {
        sourceImage: {
            width: srcImg?.info.width,
            height: srcImg?.info.height,
            format: srcImg?.info.format,
            size: sourceImage.data.length,
        },
        targetImage: {
            width: tgtImg?.info.width,
            height: tgtImg?.info.height,
            format: tgtImg?.info.format,
            size: targetImage.data.length,
        },
        diff: {
            // width,
            // height,
            // score: diff, // 0 = identical, 1 = completely different
            // similar: diff <= threshold,
        },
    };
}

function formatScore(score) {
    return (score * 100).toFixed(2) + "%";
}

async function exportReport(results, outputDir) {
    const similar = results.filter((r) => r.diff.similar).map((r) => ({ ...r, score: formatScore(r.diff.score) }));
    const different = results.filter((r) => !r.diff.similar).map((r) => ({ ...r, score: formatScore(r.diff.score) }));
    const data = {
        similar,
        different,
    };

    const ts = getTimestamp();
    await using handle = await open(join(outputDir, `image-comparison-${ts}.json`), "w");
    await handle.writeFile(JSON.stringify(data, null, 2), { encoding: "utf8" });
    await handle.close();
}

/**
 * The main function, with supplied arguments from the command line.
 * @param input
 * @param input.help
 * @param input.source
 * @param input.target
 * @param input.threshold
 * @param input.output
 */
async function main({ help, source, target, threshold, output, failFast } = {}) {
    if (help) {
        printHelp();
        process.exit(0);
    }

    if (!source || !target || !output) {
        console.error("❌ Error: --source and --target and --output are required.\n");
        printHelp();
        process.exit(1);
    }

    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        console.error("❌ Error: --threshold must be a number between 0 and 1.");
        process.exit(1);
    }

    let srcFiles, tgtFiles;
    try {
        srcFiles = await getImageFiles(source);
        console.log("srcFiles: ", srcFiles);
        tgtFiles = await getImageFiles(target);
        console.log("tgtFiles: ", tgtFiles);
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    const fileCount = Math.min(srcFiles.length, tgtFiles.length);
    const midCount = Math.floor(fileCount / 2);
    const results = [];
    let similarCount = 0;

    for (let i = 0; i < fileCount; i += 1) {
        if (i > midCount && failFast && similarCount < midCount) {
            break;
        }

        try {
            const result = await compareImages(srcFiles[i], tgtFiles[i], threshold);
            results.push({
                source: srcFiles[i],
                target: tgtFiles[i],
                ...result,
            });

            if (result.similar) {
                similarCount += 1;
            }
        } catch (e) {
            console.log(`⚠️  ERROR – ${e.message}`);
            results.push({ source: srcFiles[i], target: tgtFiles[i], score: null, similar: false, error: e.message });
        }
    }

    await exportReport(results, output);
}

await main(parseArgs(process.argv));

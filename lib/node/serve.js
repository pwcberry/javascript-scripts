/**
 * Create a server that runs in the local directory.
 */
import { createServer } from "node:http";
import process from "node:process";
import { URL } from "node:url";
import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { Buffer, isUtf8 } from "node:buffer";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function calculateTimezoneOffset(timezoneOffsetInMinutes) {
    const hours = Math.abs(Math.floor(timezoneOffsetInMinutes / 60)).toString();
    const minutes = Math.abs(timezoneOffsetInMinutes % 60).toString();
    const direction = timezoneOffsetInMinutes <= 0 ? "+" : "-";
    return `${direction}${hours.padStart(2, "0")}${minutes.padStart(2, "0")}`;
}

/**
 * Logs a request based on the Common Log Format, see:
 * https://en.wikipedia.org/wiki/Common_Log_Format
 *
 * @param requestUrl {URL}
 * @param statusCode {number}
 * @param size {number}
 */
function logRequest(requestUrl, statusCode, size = 0) {
    const now = new Date();
    const timestamp =
        `${now.getDate().toString().padStart(2, "0")}/` +
        `${MONTH[now.getMonth()]}/${now.getFullYear()}:` +
        `${now.getHours().toString().padStart(2, "0")}:` +
        `${now.getMinutes().toString().padStart(2, "0")}:` +
        `${now.getSeconds().toString().padStart(2, "0")} ` +
        calculateTimezoneOffset(now.getTimezoneOffset());

    const logEntry = [
        requestUrl.hostname,
        "-" /* RFC 1413 identity */,
        "-" /* userid of person making request */,
        timestamp /* `strftime` format */,
        `GET ${requestUrl.pathname} HTTP/1.1`,
        statusCode,
        size,
    ];
    console.log(logEntry.join(" "));
}

function isTrue(object) {
    return Object.keys(object).reduce((state, key) => {
        if (!state) {
            state = typeof object[key] === "boolean" && object[key] === true;
        }
        return state;
    }, false);
}

function getTrueKey(object) {
    return Object.keys(object).reduce((state, key) => {
        if (state === "") {
            if (object[key] === true) {
                state = key;
            }
        }
        return state;
    }, "");
}

function parseForContentType(resource) {
    let contentType = "text/plain";

    if (resource.isText) {
        contentType = `text/${getTrueKey(resource.text)}`;
    } else if (resource.isFont) {
        contentType = `font/${getTrueKey(resource.font)}`;
    } else if (resource.isImage) {
        contentType = `image/${getTrueKey(resource.image)}`;
    } else if (resource.isAudio) {
        contentType = `audio/${getTrueKey(resource.audio)}`;
    } else if (resource.isVideo) {
        contentType = `video/${getTrueKey(resource.video)}`;
    } else if (resource.isApplication) {
        contentType = `application/${getTrueKey(resource.application)}`;
    }
    return contentType;
}

function whatMimeType(mimeType, path) {
    const ext = extname(path);
    const result = {
        text: {
            plain: mimeType === "text/plain",
            html: mimeType === "text/html" || ext === ".html",
            javascript: mimeType === "text/javascript" || mimeType === "application/javascript" || ext === ".js",
            csv: mimeType === "text/csv" || mimeType === "application/csv" || ext === ".csv",
            css: mimeType === "text/css" || ext === ".css",
        },
        font: {
            otf: mimeType === "font/otf" || ext === ".otf",
            ttf: mimeType === "font/ttf" || ext === ".ttf",
            woff: mimeType === "font/woff" || ext === ".woff",
            woff2: mimeType === "font/woff2" || ext === ".woff2",
        },
        image: {
            jpeg: mimeType === "image/jpeg" || ext === ".jpg" || ext === ".jpeg",
            png: mimeType === "image/png" || ext === ".png",
            gif: mimeType === "image/gif" || ext === ".gif",
            svg: mimeType === "image/svg+xml" || ext === ".svg",
            webp: mimeType === "image/webp" || ext === ".webp",
            avif: mimeType === "image/avif" || ext === ".avif",
        },
        audio: {
            mp3: mimeType === "audio/mpeg" || ext === ".mp3",
        },
        video: {
            mp4: mimeType === "video/mp4" || mimeType === "video/mpeg" || ext === ".mp4",
            webm: mimeType === "video/webm" || ext === ".webm",
            av1: mimeType === "audio/AV1" || ext === ".av1",
        },
        application: {
            pdf: mimeType === "application/pdf" || ext === ".pdf",
            json: mimeType === "application/json" || mimeType === "text/json" || ext === ".json",
        },
    };

    result.isText = isTrue(result.text);
    result.isImage = isTrue(result.image);
    result.isAudio = isTrue(result.audio);
    result.isVideo = isTrue(result.video);
    result.isApplication = isTrue(result.application);
    result.isUtf8 = result.isText || result.application.json;
    result.contentType = parseForContentType(result);
    return result;
}

function processRequest(url, headerAccept) {
    const path = join(process.cwd(), url.pathname);
    let statusCode, contentType, data;

    try {
        // When encoding is not specified, the function returns a Buffer
        const content = readFileSync(path);
        const requestedMimeTypes = headerAccept.split(",");
        const resourceType = whatMimeType(requestedMimeTypes[0], url.pathname);

        if (isUtf8(content)) {
            data = content.toString("utf8");
        } else {
            data = content;
        }

        contentType = resourceType.contentType;
        statusCode = 200;
    } catch (error) {
        contentType = "text/plain";
        data = "";

        if (error.code === "ENOENT") {
            statusCode = 404;
        } else {
            statusCode = 500;
        }
    }

    return [statusCode, contentType, data];
}

function setExpiryDate() {
    const now = new Date();
    const day = DAY_NAME[now.getUTCDay()];
    return (
        `${day}, ${now.getUTCDate().toString().padStart(2, "0")} ` +
        `${MONTH[now.getUTCMonth()]} ${now.getUTCFullYear()} ` +
        `${now.getUTCHours().toString().padStart(2, "0")}:` +
        `${now.getUTCMinutes().toString().padStart(2, "0")}:` +
        `${now.getUTCSeconds().toString().padStart(2, "0")} GMT`
    );
}

function serve(port = process.env["PORT"]) {
    const PORT = typeof port !== "undefined" ? parseInt(port) : 8000;

    const server = createServer({ keepAliveTimeout: 30000 }, (req, res) => {
        // This script will always handle requests made with the HTTP protocol from localhost
        const requestUrl = new URL(req.url, `http://127.0.0.1`);

        // const [statusCode, contentType, data] = processRequest(requestUrl, req.headers["accept"]);
        const [statusCode, contentType, data] = [200, "text/html", "<p>HELLO WORLD</p>"];
        const contentLength = Buffer.byteLength(data, "utf8");

        // Improvement: Specify the expiry for the content
        res.setHeaders(
            new Map([
                ["Content-Type", contentType],
                ["Content-Length", contentLength],
                ["Expires", setExpiryDate()],
            ])
        );
        res.writeHead(statusCode);

        res.write(data);
        res.end("\n");

        logRequest(requestUrl, statusCode, contentLength);
    });

    console.log("Listening on port:", PORT);
    server.listen(PORT);
}

serve(process.argv[2]);

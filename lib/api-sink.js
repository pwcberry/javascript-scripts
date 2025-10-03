/**
 * Create a server that logs requests to an endpoint
 * Useful for understanding what calls a server component is making.
 */
import { createServer } from "node:http";
import process from "node:process";
import { URL } from "node:url";
import crypto from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Buffer } from "node:buffer";

function checkDir(path) {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
        return 0;
    }

    return readdirSync(path).filter((file) => file.endsWith(".log")).length;
}

function getFileStats(path) {
    const stats = existsSync(path)
        ? statSync(path)
        : {
              isFile() {
                  return false;
              },
              size: 0,
          };
    return {
        isFile: stats.isFile(),
        isUnderBudget: stats.size < 1e6,
    };
}

/**
 * @param logDirectory {string}
 * @param requestUrl {URL}
 * @param requestBody {string}
 * @param responseBody {string}
 * @param statusCode {number}
 */
function logRequest(logDirectory, requestUrl, requestBody, responseBody, statusCode) {
    const logFullDirectory = join(process.cwd(), logDirectory);
    const fileCount = checkDir(logFullDirectory);

    const now = new Date();
    const timestamp =
        `${now.getFullYear().toString()}-` +
        `${(now.getMonth() + 1).toString().padStart(2, "0")}-` +
        `${now.getDate().toString().padStart(2, "0")} ` +
        `${now.getHours().toString().padStart(2, "0")}:` +
        `${now.getMinutes().toString().padStart(2, "0")}:` +
        now.getSeconds().toString().padStart(2, "0");

    const logEntry = JSON.stringify({
        request: {
            host: requestUrl.hostname,
            path: requestUrl.pathname,
            port: requestUrl.port,
        },
        requestBody,
        responseBody,
        statusCode,
        timestamp,
    });

    let logIndex = fileCount > 0 ? fileCount.toString().padStart(4, "0") : "0001";
    let logFilePath = join(logFullDirectory, `requests-${logIndex}.log`);
    const stats = getFileStats(logFilePath);

    if (!stats.isFile) {
        writeFileSync(logFilePath, logEntry + "\n", { encoding: "utf8" });
    } else if (!stats.isUnderBudget) {
        logIndex = (parseInt(logIndex) + 1).toString().padStart(4, "0");
        logFilePath = join(logFullDirectory, `requests-${logIndex}.log`);
        writeFileSync(logFilePath, logEntry + "\n", { encoding: "utf8" });
    } else {
        appendFileSync(logFilePath, logEntry + "\n", { encoding: "utf8" });
    }
}

function uuid() {
    const bytes = crypto.randomBytes(16).toString("hex");
    return `${bytes.substring(0, 8)}-${bytes.substring(8, 12)}-${bytes.substring(12, 16)}-${bytes.substring(16, 20)}-${bytes.substring(20)}`;
}

function processRequest(method = "GET") {
    let statusCode, contentType, data;

    data = JSON.stringify({
        uploadId: uuid(),
    });
    contentType = "application/json";
    statusCode = method.toUpperCase() === "POST" ? 202 : 200;

    return [statusCode, contentType, data];
}

async function getRequestBody(req) {
    let body = "";

    if (req.method?.toUpperCase() === "POST") {
        for await (const chunk of req) {
            body += chunk.toString();
        }
    }

    return body;
}

function serve(port = process.env["PORT"], logDirectory = ".") {
    const PORT = typeof port !== "undefined" ? parseInt(port) : 8000;

    const server = createServer({ keepAliveTimeout: 10000 }, async (req, res) => {
        // This script will always handle requests made with the HTTP protocol from localhost
        const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
        const requestBody = await getRequestBody(req);

        const [statusCode, contentType, data] = processRequest(req.method);
        const contentLength = Buffer.byteLength(data, "utf8");

        res.setHeaders(
            new Map([
                ["Content-Type", contentType],
                ["Content-Length", contentLength],
            ])
        );
        res.writeHead(statusCode);

        res.write(data);
        res.end("\n");

        logRequest(logDirectory, requestUrl, requestBody, data, statusCode);
    });

    console.log("Listening on port:", PORT);
    server.listen(PORT);
}

serve(process.argv[2], process.argv[3]);

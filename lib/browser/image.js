/**
 * Reads a Blob's bytes and resolves with just the Base64 payload of its data URL
 * (i.e. everything after the "data:<type>;base64," prefix).
 *
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches the binary data an <img> element refers to and encodes it as Base64.
 *
 * @param {HTMLImageElement} imageElement
 * @returns {Promise<{data: string, type: string}>} `data` is the Base64-encoded image
 *   bytes; `type` is the image's MIME type (e.g. "image/png").
 * @throws {TypeError} If imageElement is not an HTMLImageElement.
 */
async function extractImageData(imageElement) {
  if (!(imageElement instanceof HTMLImageElement)) {
    throw new TypeError("extractImageData: \"imageElement\" must be an HTMLImageElement.");
  }

  const response = await fetch(imageElement.src);
  const blob = await response.blob();
  const data = await blobToBase64(blob);

  return { data, type: blob.type };
}

export { extractImageData };

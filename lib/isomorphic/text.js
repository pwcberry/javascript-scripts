const toCamelCase = s => s.toLowerCase()
  .replace(/\s(\w)/g, match => match[1].toUpperCase())
  .replace(/\W(\w)/g, "_$1")
  .replace(/\W/g, "");

export { toCamelCase };

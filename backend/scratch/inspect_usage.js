const pdfNode = require("pdf-parse/node");
console.log("pdfParse/node type:", typeof pdfNode);
console.log("pdfParse/node keys:", Object.keys(pdfNode));

// Let's inspect the constructors and functions
const pdfParseCore = require("pdf-parse");
console.log("\npdf-parse keys:", Object.keys(pdfParseCore));

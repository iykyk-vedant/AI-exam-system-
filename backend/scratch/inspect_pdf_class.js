const { PDFParse } = require("pdf-parse");

try {
  console.log("PDFParse class:", PDFParse);
  // Try instantiating with an empty buffer to see if it instantiates successfully
  const parser = new PDFParse({ data: Buffer.from([]) });
  console.log("Instantiated PDFParse successfully:", parser);
} catch (err) {
  console.error("Instantiation failed:", err);
}

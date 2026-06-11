const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { PDFParse } = require("pdf-parse");

async function testPdf() {
  const pdfPath = path.join(__dirname, "sample.pdf");
  
  // 1. Create a simple PDF using pdfkit
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);
  
  doc.fontSize(12).text("1. What is the complexity of Bubble Sort in worst-case?", 100, 100);
  doc.text("A. O(N^2)", 100, 120);
  doc.text("B. O(N)", 100, 140);
  doc.text("C. O(log N)", 100, 160);
  doc.text("D. O(1)", 100, 180);
  doc.text("Answer: A", 100, 200);
  
  doc.end();
  
  await new Promise((resolve) => writeStream.on("finish", resolve));
  console.log("PDF created successfully at:", pdfPath);
  
  // 2. Parse the PDF using the new PDFParse implementation
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    
    console.log("\nParsed PDF Text output:\n", result.text);
    
    if (result.text.includes("Bubble Sort") && result.text.includes("O(N^2)")) {
      console.log("✅ PDF Text Extraction test passed!");
    } else {
      console.error("❌ PDF Text Extraction failed. Output does not contain expected text.");
    }
  } catch (err) {
    console.error("❌ PDF parsing threw an error:", err);
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(pdfPath);
    } catch (_) {}
  }
}

testPdf();

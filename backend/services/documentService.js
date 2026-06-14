/**
 * DocumentService: handles document upload, parsing, and chunking for RAG
 */
const multer = require('multer');
const pdfParse = require('pdf-parse');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, '../uploads') });

async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }

  const uid = req.user.uid;
  const filePath = req.file.path;
  const fileName = req.file.originalname;

  try {
    // Create record in DB
    const docRes = await db.query(
      `INSERT INTO uploaded_documents (file_name, file_path, uploaded_by, processing_status, parsed_json)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fileName, filePath, uid, 'UPLOADED', '{}']
    );

    const doc = docRes.rows[0];
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('DocumentService uploadDocument error:', err);
    fs.unlink(filePath, () => {});
    return res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
}

async function parseDocumentText(filePath) {
  if (filePath.toLowerCase().endsWith('.pdf')) {
    const data = fs.readFileSync(filePath);
    const pdf = await pdfParse(data);
    return pdf.text;
  } else if (filePath.toLowerCase().endsWith('.txt')) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  throw new Error('Unsupported file type. Use PDF or TXT.');
}

async function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

async function processDocument(req, res) {
  const { documentId } = req.body;

  if (!documentId) {
    return res.status(400).json({ success: false, error: 'documentId required' });
  }

  try {
    // Fetch document
    const docRes = await db.query(
      'SELECT * FROM uploaded_documents WHERE id = $1',
      [documentId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = docRes.rows[0];

    // Parse text
    const text = await parseDocumentText(doc.file_path);

    // Chunk text
    const chunks = await chunkText(text);

    // Update document status
    await db.query(
      `UPDATE uploaded_documents SET processing_status = $1, parsed_json = $2 WHERE id = $3`,
      ['PROCESSED', JSON.stringify({ chunks: chunks.length, sampledChunks: chunks.slice(0, 3) }), documentId]
    );

    return res.status(200).json({
      success: true,
      message: 'Document processed',
      chunkCount: chunks.length,
      sampleChunks: chunks.slice(0, 3)
    });
  } catch (err) {
    console.error('DocumentService processDocument error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  upload,
  uploadDocument,
  parseDocumentText,
  chunkText,
  processDocument
};

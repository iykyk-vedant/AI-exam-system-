const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const db = require("../config/db");
const { parseDocumentStructure, extractConcepts, normalizeConcepts, deduplicateConcepts, generateBlueprintsForConcept } = require("../utils/aiService");
const { generateVariant } = require("../utils/variantEngine");

/**
 * Handles document upload.
 * Route: POST /api/question-bank/upload
 */
async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded. Please select a PDF or TXT file."
    });
  }

  const facultyUid = req.user.uid;
  const fileName = req.file.originalname;

  try {
    const queryText = `
      INSERT INTO uploaded_documents (file_name, uploaded_by, processing_status)
      VALUES ($1, $2, 'UPLOADED')
      RETURNING *;
    `;
    const result = await db.query(queryText, [fileName, facultyUid]);

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Failed to register uploaded document:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to upload document.",
      details: error.message
    });
  }
}

/**
 * Extracts concepts from raw text (Stage 1).
 * Route: POST /api/question-bank/process
 */
async function processDocument(req, res) {
  const { documentId } = req.body;

  if (!documentId) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameter: documentId is required."
    });
  }

  try {
    // 1. Fetch document record
    const docRes = await db.query("SELECT * FROM uploaded_documents WHERE id = $1 LIMIT 1", [documentId]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Uploaded document record not found." });
    }

    const doc = docRes.rows[0];

    // Find the uploaded file in temp uploads directory
    const uploadsDir = path.join(__dirname, "../uploads");
    let filePath = path.join(uploadsDir, doc.id);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(uploadsDir, doc.file_name);
    }
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        if (files.length > 0) {
          filePath = path.join(uploadsDir, files[files.length - 1]);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      await db.query("UPDATE uploaded_documents SET processing_status = 'FAILED' WHERE id = $1", [documentId]);
      return res.status(404).json({
        success: false,
        error: `Physical file could not be found for processing in path: ${filePath}`
      });
    }

    // 2. Set status to PROCESSING
    await db.query("UPDATE uploaded_documents SET processing_status = 'PROCESSING' WHERE id = $1", [documentId]);

    // 3. Extract text content
    let fileText = "";
    if (doc.file_name.toLowerCase().endsWith(".pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const parsedPdf = await parser.getText();
      fileText = parsedPdf.text;
    } else {
      fileText = fs.readFileSync(filePath, "utf8");
    }

    if (!fileText || fileText.trim() === "") {
      throw new Error("No text content could be extracted from the document.");
    }

    // 4. Stage 0: Document Structure Parsing
    console.log("Stage 0: Parsing document structure...");
    const parsedStructure = await parseDocumentStructure(fileText);
    console.log(`Parsed structure: ${parsedStructure.title}, ${parsedStructure.sections?.length || 0} sections`);

    // Store parsed structure on the document record
    await db.query(
      "UPDATE uploaded_documents SET parsed_json = $1 WHERE id = $2",
      [JSON.stringify(parsedStructure), documentId]
    );

    // 5. Stage 1: Topic & Concept Extraction (from parsed structure)
    console.log("Stage 1: Extracting topics and concepts from parsed structure...");
    const extractionResult = await extractConcepts(parsedStructure);
    const rawTopics = extractionResult.topics || [];
    const rawConcepts = extractionResult.concepts || [];

    // Stage 2: Normalize raw concepts
    console.log("Stage 2: Normalizing concepts...");
    const normalizedConcepts = await normalizeConcepts(rawConcepts);

    // Stage 3: Deduplicate normalized concepts
    console.log("Stage 3: Deduplicating concepts...");
    const deduplicatedConcepts = deduplicateConcepts(normalizedConcepts);

    // 6. Insert topics and get IDs
    const topicIds = {}; // topic_name -> topic_id
    for (const t of rawTopics) {
      const insertTopicQuery = `
        INSERT INTO topics (source_document_id, topic_name, description, confidence_score)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `;
      const topicConfidence = t.confidence_score !== undefined ? t.confidence_score : 1.0;
      const topicRes = await db.query(insertTopicQuery, [documentId, t.topic_name, t.description || "", topicConfidence]);
      if (topicRes.rows.length > 0) {
        topicIds[t.topic_name] = topicRes.rows[0].id;
      }
    }

    // Insert concept candidates
    for (const c of deduplicatedConcepts) {
      let topicId = topicIds[c.topic_name];
      if (!topicId) {
        // Fallback insert if topic didn't exist in rawTopics
        const selectRes = await db.query("SELECT id FROM topics WHERE source_document_id = $1 AND topic_name = $2 LIMIT 1", [documentId, c.topic_name]);
        if (selectRes.rows.length > 0) {
          topicId = selectRes.rows[0].id;
        } else {
          const insertTopicQuery = `
            INSERT INTO topics (source_document_id, topic_name, description, confidence_score)
            VALUES ($1, $2, 'Group of related concepts.', 0.70)
            RETURNING id;
          `;
          const fallbackRes = await db.query(insertTopicQuery, [documentId, c.topic_name]);
          topicId = fallbackRes.rows[0].id;
        }
        topicIds[c.topic_name] = topicId;
      }

      const queryText = `
        INSERT INTO concept_candidates (
          source_document_id, topic_id, raw_concept, normalized_concept, learning_objective, difficulty, confidence_score, extraction_reason, source_snippet, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_REVIEW')
        RETURNING *;
      `;
      const values = [
        documentId,
        topicId,
        c.raw_concept || c.concept || "Key Concept",
        c.normalized_concept,
        c.learning_objective || "",
        c.difficulty || "Medium",
        c.confidence_score || 1.0,
        c.extraction_reason || "",
        c.source_snippet || ""
      ];
      await db.query(queryText, values);
    }

    // Compile AI processing report
    const report = {
      totalConcepts: deduplicatedConcepts.length,
      totalTopics: rawTopics.length,
      documentTitle: parsedStructure.title || "Unknown",
      sectionsFound: parsedStructure.sections?.length || 0
    };

    // 8. Update document status and save report
    await db.query(
      `UPDATE uploaded_documents 
       SET processing_status = 'COMPLETED', report_json = $1 
       WHERE id = $2`,
      [JSON.stringify(report), documentId]
    );

    // Try deleting physical file to keep environment clean
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: "Document processing completed successfully.",
      report
    });

  } catch (error) {
    console.error("Failed to process document:", error);
    await db.query("UPDATE uploaded_documents SET processing_status = 'FAILED' WHERE id = $1", [documentId]);
    return res.status(500).json({
      success: false,
      error: "Document processing failed.",
      details: error.message
    });
  }
}

/**
 * Lists concept candidates.
 * Route: GET /api/concept-candidates
 */
async function listConcepts(req, res) {
  try {
    const queryText = `
      SELECT cc.*, ud.file_name, t.topic_name as topic 
      FROM concept_candidates cc
      LEFT JOIN uploaded_documents ud ON cc.source_document_id = ud.id
      LEFT JOIN topics t ON cc.topic_id = t.id
      WHERE cc.status != 'REJECTED'
      ORDER BY cc.created_at DESC;
    `;
    const result = await db.query(queryText);

    // Backward-compatibility: map fields for UI
    const mappedRows = result.rows.map(row => ({
      ...row,
      concept: row.normalized_concept,
      concept_name: row.normalized_concept,
      topic: row.topic || "General"
    }));

    return res.status(200).json({
      success: true,
      data: mappedRows
    });
  } catch (error) {
    console.error("Failed to fetch concept candidates:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch concept candidates.",
      details: error.message
    });
  }
}

/**
 * Edit concept candidate details.
 * Route: PUT /api/concept-candidates/:id
 */
async function updateConcept(req, res) {
  const { id } = req.params;
  const { topic, raw_concept, concept, normalized_concept, learning_objective, difficulty, confidence_score, extraction_reason, source_snippet } = req.body;

  const rawToUpdate = raw_concept || concept || "Concept";
  const normToUpdate = normalized_concept || concept || "Concept";

  try {
    const queryText = `
      UPDATE concept_candidates 
      SET raw_concept = $1, normalized_concept = $2, learning_objective = $3, difficulty = $4, confidence_score = $5, extraction_reason = $6, source_snippet = $7
      WHERE id = $8
      RETURNING *;
    `;
    const result = await db.query(queryText, [
      rawToUpdate,
      normToUpdate,
      learning_objective,
      difficulty,
      confidence_score,
      extraction_reason,
      source_snippet,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Concept candidate not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Concept candidate successfully updated.",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Failed to update concept candidate:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update concept candidate.",
      details: error.message
    });
  }
}

/**
 * Approves a concept candidate.
 * Route: POST /api/concept-candidates/:id/approve
 */
async function approveConcept(req, res) {
  const { id } = req.params;

  try {
    const result = await db.query(
      "UPDATE concept_candidates SET status = 'APPROVED' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Concept candidate not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Concept candidate successfully approved.",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Failed to approve concept candidate:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to approve concept candidate.",
      details: error.message
    });
  }
}

/**
 * Rejects a concept candidate.
 * Route: POST /api/concept-candidates/:id/reject
 */
async function rejectConcept(req, res) {
  const { id } = req.params;

  try {
    const result = await db.query(
      "UPDATE concept_candidates SET status = 'REJECTED' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Concept candidate not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Concept candidate successfully rejected."
    });
  } catch (error) {
    console.error("Failed to reject concept candidate:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reject concept candidate.",
      details: error.message
    });
  }
}

/**
 * Triggers Stage 2 Assessment Blueprint Generation from an approved concept.
 * Route: POST /api/concept-candidates/:id/generate-blueprints
 */
async function generateBlueprints(req, res) {
  const { id } = req.params;

  try {
    // 1. Fetch approved concept
    const conceptRes = await db.query(`
      SELECT cc.*, t.topic_name
      FROM concept_candidates cc
      LEFT JOIN topics t ON cc.topic_id = t.id
      WHERE cc.id = $1 LIMIT 1
    `, [id]);

    if (conceptRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Concept candidate not found." });
    }

    const concept = conceptRes.rows[0];
    if (concept.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        error: "Cannot generate blueprints for a concept that is not APPROVED."
      });
    }

    // 2. Call AI Service to generate blueprints (MCQ and Short Answer)
    const blueprints = await generateBlueprintsForConcept(concept);

    await db.query('BEGIN');
    // 3. Save blueprints into blueprint_candidates linked back to concept
    const insertedBlueprints = [];
    for (const bp of blueprints) {
      const insertQuery = `
        INSERT INTO blueprint_candidates (
          source_document_id, concept_candidate_id, original_question, generated_json, quality_score, confidence_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_REVIEW')
        RETURNING *;
      `;
      const originalQuestion = `Concept: ${concept.normalized_concept}. Objective: ${concept.learning_objective || ""}`;
      const values = [
        concept.source_document_id,
        id,
        originalQuestion,
        bp.generated_json,
        bp.quality_score,
        bp.confidence_score
      ];
      const bpRes = await db.query(insertQuery, values);
      insertedBlueprints.push(bpRes.rows[0]);
    }
    await db.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: "Successfully generated candidate blueprints for the concept.",
      data: insertedBlueprints
    });

  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error("Failed to generate blueprints for concept:", error.message);
    return res.status(500).json({
      success: false,
      error: "Blueprint generation failed.",
      details: error.message
    });
  }
}

/**
 * Triggers bulk blueprint generation for multiple approved concepts (Change 5).
 * Route: POST /api/concept-candidates/generate-blueprints-bulk
 */
async function generateBlueprintsBulk(req, res) {
  const { conceptIds } = req.body;

  if (!conceptIds || !Array.isArray(conceptIds) || conceptIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid parameter: conceptIds array is required."
    });
  }

  let processed = 0;
  let generated = 0;
  let failed = 0;

  for (const id of conceptIds) {
    try {
      // 1. Fetch approved concept
      const conceptRes = await db.query(`
        SELECT cc.*, t.topic_name
        FROM concept_candidates cc
        LEFT JOIN topics t ON cc.topic_id = t.id
        WHERE cc.id = $1 LIMIT 1
      `, [id]);

      if (conceptRes.rows.length === 0) {
        failed++;
        continue;
      }

      const concept = conceptRes.rows[0];
      if (concept.status !== "APPROVED") {
        failed++;
        continue;
      }

      // 2. Generate MCQ and Short Answer
      const blueprints = await generateBlueprintsForConcept(concept);

      // 3. Save blueprints
      await db.query('BEGIN');
      for (const bp of blueprints) {
        const insertQuery = `
          INSERT INTO blueprint_candidates (
            source_document_id, concept_candidate_id, original_question, generated_json, quality_score, confidence_score, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_REVIEW')
          RETURNING *;
        `;
        const originalQuestion = `Concept: ${concept.normalized_concept}. Objective: ${concept.learning_objective || ""}`;
        const values = [
          concept.source_document_id,
          id,
          originalQuestion,
          bp.generated_json,
          bp.quality_score,
          bp.confidence_score
        ];
        await db.query(insertQuery, values);
        generated++;
      }
      await db.query('COMMIT');

      processed++;
    } catch (err) {
      try { await db.query('ROLLBACK'); } catch (_) {}
      console.error(`Failed to bulk generate blueprints for concept ID ${id}:`, err.message);
      failed++;
    }
  }

  return res.status(200).json({
    success: true,
    processed,
    generated,
    failed
  });
}

/**
 * Lists all pending candidates.
 * Route: GET /api/blueprint-candidates
 */
async function listCandidates(req, res) {
  try {
    const queryText = `
      SELECT bc.*, ud.file_name, t.topic_name as concept_topic, cc.normalized_concept as concept_name
      FROM blueprint_candidates bc
      LEFT JOIN uploaded_documents ud ON bc.source_document_id = ud.id
      LEFT JOIN concept_candidates cc ON bc.concept_candidate_id = cc.id
      LEFT JOIN topics t ON cc.topic_id = t.id
      WHERE bc.status = 'PENDING_REVIEW'
      ORDER BY bc.created_at DESC;
    `;
    const result = await db.query(queryText);
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch blueprint candidates:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch blueprint candidates.",
      details: error.message
    });
  }
}

/**
 * Faculty edits a candidate before approval.
 * Route: PUT /api/blueprint-candidates/:id
 */
async function updateCandidate(req, res) {
  const { id } = req.params;
  const { generatedJson } = req.body;

  if (!generatedJson) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameter: generatedJson is required."
    });
  }

  try {
    const result = await db.query(
      "UPDATE blueprint_candidates SET generated_json = $1 WHERE id = $2 RETURNING *",
      [generatedJson, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Candidate blueprint not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Candidate blueprint successfully updated.",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Failed to update candidate blueprint:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update candidate blueprint.",
      details: error.message
    });
  }
}

/**
 * Moves candidate to Blueprint Library (status = APPROVED).
 * Route: POST /api/blueprint-candidates/:id/approve
 */
async function approveCandidate(req, res) {
  const { id } = req.params;
  const facultyUid = req.user.uid;

  try {
    // 1. Fetch candidate
    const candRes = await db.query("SELECT * FROM blueprint_candidates WHERE id = $1 LIMIT 1", [id]);
    if (candRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Candidate not found." });
    }

    const cand = candRes.rows[0];
    if (cand.status !== "PENDING_REVIEW") {
      return res.status(400).json({
        success: false,
        error: `Cannot approve candidate that is already ${cand.status}.`
      });
    }

    const bp = cand.generated_json;

    await db.query('BEGIN');
    // 2. Insert into blueprints
    const insertQuery = `
      INSERT INTO blueprints (
        title, topic, difficulty, question_type, learning_objective,
        template_text, options_templates, correct_option_template, variable_sets,
        tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const insertValues = [
      bp.title || "AI Generated Blueprint",
      bp.topic || "General",
      bp.difficulty || "Medium",
      bp.question_type || bp.questionType || "multiple-choice",
      bp.learning_objective || bp.learningObjective || "",
      bp.template_text || bp.templateText,
      bp.options_templates || bp.optionsTemplates || [],
      bp.correct_option_template || bp.correctOptionTemplate || "0",
      bp.variable_sets || bp.variableSets || { type: "explicit", sets: [{}] },
      bp.tags || [],
      facultyUid
    ];

    const bpResult = await db.query(insertQuery, insertValues);

    // 3. Mark candidate as APPROVED
    await db.query("UPDATE blueprint_candidates SET status = 'APPROVED' WHERE id = $1", [id]);

    await db.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: "Blueprint candidate approved successfully and added to library.",
      data: bpResult.rows[0]
    });

  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error("Failed to approve candidate blueprint:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to approve candidate blueprint.",
      details: error.message
    });
  }
}

/**
 * Rejects candidate (status = REJECTED).
 * Route: POST /api/blueprint-candidates/:id/reject
 */
async function rejectCandidate(req, res) {
  const { id } = req.params;

  try {
    const result = await db.query(
      "UPDATE blueprint_candidates SET status = 'REJECTED' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Blueprint candidate not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Blueprint candidate successfully rejected."
    });
  } catch (error) {
    console.error("Failed to reject candidate blueprint:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reject candidate blueprint.",
      details: error.message
    });
  }
}

/**
 * Rejects all pending blueprint candidates at once.
 * Route: POST /api/blueprint-candidates/reject-all
 */
async function rejectAllCandidates(req, res) {
  try {
    const result = await db.query(
      "UPDATE blueprint_candidates SET status = 'REJECTED' WHERE status = 'PENDING_REVIEW' RETURNING *"
    );

    return res.status(200).json({
      success: true,
      message: `Successfully rejected all ${result.rowCount} pending blueprint candidates.`
    });
  } catch (error) {
    console.error("Failed to reject all blueprint candidates:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reject all blueprint candidates.",
      details: error.message
    });
  }
}

/**
 * Rejects all pending concept candidates at once.
 * Route: POST /api/concept-candidates/reject-all
 */
async function rejectAllConcepts(req, res) {
  try {
    const result = await db.query(
      "UPDATE concept_candidates SET status = 'REJECTED' WHERE status = 'PENDING_REVIEW' RETURNING *"
    );

    return res.status(200).json({
      success: true,
      message: `Successfully rejected all ${result.rowCount} pending concept candidates.`
    });
  } catch (error) {
    console.error("Failed to reject all concept candidates:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reject all concept candidates.",
      details: error.message
    });
  }
}

/**
 * Previews 3 variants of the candidate blueprint.
 * Route: POST /api/blueprint-candidates/:id/preview
 */
async function previewCandidateVariants(req, res) {
  const { id } = req.params;

  try {
    const candRes = await db.query("SELECT * FROM blueprint_candidates WHERE id = $1 LIMIT 1", [id]);
    if (candRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Blueprint candidate not found." });
    }

    const bp = candRes.rows[0].generated_json;

    // Generate 3 dynamic variants using different seeds
    const variants = [];
    const seeds = [
      Math.floor(Math.random() * 10000000).toString(),
      Math.floor(Math.random() * 10000000).toString(),
      Math.floor(Math.random() * 10000000).toString()
    ];

    for (const seed of seeds) {
      try {
        const variant = generateVariant(bp, seed);
        variants.push({
          seed,
          questionText: variant.questionText,
          options: variant.options,
          correctOption: variant.correctOption,
          selectedVariables: variant.selectedVariables
        });
      } catch (err) {
        // Fallback placeholder if variant generation fails
        variants.push({
          seed,
          questionText: bp.template_text || "Failed to generate variant",
          options: bp.options_templates || [],
          correctOption: 0,
          selectedVariables: {}
        });
      }
    }

    return res.status(200).json({
      success: true,
      variants
    });

  } catch (error) {
    console.error("Failed to generate candidate variants preview:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate candidates variant previews.",
      details: error.message
    });
  }
}

/**
 * Lists documents with reports.
 * Route: GET /api/question-bank/documents
 */
async function listDocuments(req, res) {
  try {
    const result = await db.query(
      "SELECT * FROM uploaded_documents ORDER BY uploaded_at DESC LIMIT 4"
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Failed to list documents:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list uploaded documents."
    });
  }
}

/**
 * Lists all extracted topics with document context.
 * Route: GET /api/topics
 */
async function listTopics(req, res) {
  try {
    const result = await db.query(`
      SELECT t.*, 
             ud.file_name AS source_file_name,
             (SELECT COUNT(*) FROM concept_candidates cc WHERE cc.topic_id = t.id) AS concept_count
      FROM topics t
      LEFT JOIN uploaded_documents ud ON ud.id = t.source_document_id
      ORDER BY t.created_at DESC
    `);
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Failed to list topics:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list topics."
    });
  }
}

/**
 * Deletes a topic and cascades to its concept candidates.
 * Route: DELETE /api/topics/:id
 */
async function deleteTopic(req, res) {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM topics WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Topic not found." });
    }
    return res.status(200).json({
      success: true,
      message: "Topic and its linked concepts deleted successfully.",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Failed to delete topic:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete topic."
    });
  }
}

module.exports = {
  uploadDocument,
  processDocument,
  listConcepts,
  updateConcept,
  approveConcept,
  rejectConcept,
  rejectAllConcepts,
  generateBlueprints,
  generateBlueprintsBulk,
  listCandidates,
  updateCandidate,
  approveCandidate,
  rejectCandidate,
  rejectAllCandidates,
  previewCandidateVariants,
  listDocuments,
  listTopics,
  deleteTopic
};

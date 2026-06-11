const db = require("../config/db");
const { generateVariant } = require("../utils/variantEngine");

/**
 * Creates a new reusable question blueprint.
 * Route: POST /api/blueprints
 */
async function createBlueprint(req, res) {
  const {
    title,
    topic,
    difficulty,
    questionType,
    learningObjective,
    templateText,
    optionsTemplates,
    correctOptionTemplate,
    variableSets,
    tags,
  } = req.body;
  const facultyUid = req.user.uid;

  if (!title || !templateText || !optionsTemplates || !correctOptionTemplate || !variableSets) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters to create blueprint.",
    });
  }

  const allowedDifficulties = ["Easy", "Medium", "Hard"];
  const finalDifficulty = allowedDifficulties.includes(difficulty) ? difficulty : "Medium";

  try {
    const queryText = `
      INSERT INTO blueprints (
        title, topic, difficulty, question_type, learning_objective,
        template_text, options_templates, correct_option_template, variable_sets,
        tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      title,
      topic || "",
      finalDifficulty,
      questionType || "multiple-choice",
      learningObjective || "",
      templateText,
      optionsTemplates,
      correctOptionTemplate,
      typeof variableSets === "string" ? JSON.parse(variableSets) : variableSets,
      Array.isArray(tags) ? tags : [],
      facultyUid,
    ];

    const result = await db.query(queryText, values);
    return res.status(201).json({
      success: true,
      message: "Question blueprint successfully created.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to create blueprint:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create blueprint.",
      details: error.message,
    });
  }
}

/**
 * Lists all reusable blueprints.
 * Route: GET /api/blueprints
 */
async function listBlueprints(req, res) {
  try {
    const result = await db.query("SELECT * FROM blueprints ORDER BY created_at DESC");
    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Failed to list blueprints:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list blueprints.",
      details: error.message,
    });
  }
}

/**
 * Gets details of a single blueprint.
 * Route: GET /api/blueprints/:id
 */
async function getBlueprintDetails(req, res) {
  const { id } = req.params;

  try {
    const result = await db.query("SELECT * FROM blueprints WHERE id = $1 LIMIT 1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Blueprint not found.",
      });
    }
    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch blueprint details:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch blueprint details.",
      details: error.message,
    });
  }
}

/**
 * Updates a blueprint.
 * Route: PUT /api/blueprints/:id
 */
async function updateBlueprint(req, res) {
  const { id } = req.params;
  const {
    title,
    topic,
    difficulty,
    questionType,
    learningObjective,
    templateText,
    optionsTemplates,
    correctOptionTemplate,
    variableSets,
    tags,
  } = req.body;

  if (!title || !templateText || !optionsTemplates || !correctOptionTemplate || !variableSets) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters to update blueprint.",
    });
  }

  const allowedDifficulties = ["Easy", "Medium", "Hard"];
  const finalDifficulty = allowedDifficulties.includes(difficulty) ? difficulty : "Medium";

  try {
    const queryText = `
      UPDATE blueprints
      SET title = $1, topic = $2, difficulty = $3, question_type = $4,
          learning_objective = $5, template_text = $6, options_templates = $7,
          correct_option_template = $8, variable_sets = $9, tags = $10
      WHERE id = $11
      RETURNING *;
    `;
    const values = [
      title,
      topic || "",
      finalDifficulty,
      questionType || "multiple-choice",
      learningObjective || "",
      templateText,
      optionsTemplates,
      correctOptionTemplate,
      typeof variableSets === "string" ? JSON.parse(variableSets) : variableSets,
      Array.isArray(tags) ? tags : [],
      id,
    ];

    const result = await db.query(queryText, values);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Blueprint not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blueprint successfully updated.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update blueprint:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update blueprint.",
      details: error.message,
    });
  }
}

/**
 * Deletes a blueprint.
 * Route: DELETE /api/blueprints/:id
 */
async function deleteBlueprint(req, res) {
  const { id } = req.params;

  try {
    const result = await db.query("DELETE FROM blueprints WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Blueprint not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blueprint successfully deleted.",
    });
  } catch (error) {
    console.error("Failed to delete blueprint:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete blueprint.",
      details: error.message,
    });
  }
}

/**
 * Live variant generation preview (does not persist state).
 * Route: POST /api/blueprints/preview
 */
async function previewBlueprintVariant(req, res) {
  const blueprintData = req.body;

  if (!blueprintData.template_text || !blueprintData.options_templates || !blueprintData.correct_option_template || !blueprintData.variable_sets) {
    return res.status(400).json({
      success: false,
      error: "Incomplete blueprint definition for preview.",
    });
  }

  try {
    const seed = Math.floor(Math.random() * 1000000000).toString();
    const variant = generateVariant(blueprintData, seed);

    return res.status(200).json({
      success: true,
      data: {
        variant_seed: seed,
        ...variant,
      },
    });
  } catch (error) {
    console.error("Blueprint variant preview generation failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate preview variant.",
      details: error.message,
    });
  }
}

module.exports = {
  createBlueprint,
  listBlueprints,
  getBlueprintDetails,
  updateBlueprint,
  deleteBlueprint,
  previewBlueprintVariant,
};

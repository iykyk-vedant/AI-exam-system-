const axios = require("axios");
const envConfig = require("../config/env");

/**
 * Custom Seeded Random Heuristic for quality/confidence scoring.
 */
function calculateScores(blueprint) {
  let quality = 70;
  let confidence = 0.8;

  // Heuristic adjustments
  if (blueprint.template_text && blueprint.template_text.includes("{{")) {
    quality += 15; // Parameterized template is higher quality
    confidence += 0.1;
  }
  if (blueprint.options_templates && blueprint.options_templates.length === 4) {
    quality += 10;
  } else if (blueprint.question_type === "multiple-choice") {
    quality -= 20; // Penalize missing/incorrect options count for MCQ
  }
  if (blueprint.correct_option_template !== undefined) {
    quality += 5;
  } else {
    quality -= 15; // Penalize missing correct option
  }

  // Bound scores
  quality = Math.max(30, Math.min(100, quality));
  confidence = Math.max(0.4, Math.min(1.0, parseFloat(confidence.toFixed(2))));

  return { quality_score: quality, confidence_score: confidence };
}

/**
 * ============================================
 * STAGE 0: DOCUMENT STRUCTURE PARSING
 * ============================================
 * Parses raw document text into a structured hierarchy of sections.
 */

/**
 * Rules-based fallback for document structure parsing.
 * Splits text by heading patterns (ALL CAPS lines, Module/Unit/Chapter prefixes, === underlines).
 */
function fallbackParseDocumentStructure(text) {
  const lines = text.split(/\n/);
  const sections = [];
  let currentSection = null;
  let contentBuffer = [];

  const headingPatterns = [
    /^(?:module|unit|chapter|section|part|topic)\s*[\d.:]+\s*[:\-–]?\s*(.+)/i,
    /^[A-Z][A-Z\s]{5,}$/,
    /^#{1,4}\s+(.+)/,
    /^(.+)\n[=]{3,}$/,
    /^(\d+\.)\s+([A-Z][A-Za-z\s]{3,})$/,
  ];

  const isHeading = (line) => {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 120) return false;
    for (const pattern of headingPatterns) {
      if (pattern.test(trimmed)) return true;
    }
    // All-caps line with at least 2 words
    if (/^[A-Z][A-Z\s,&:–\-]{4,}$/.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
      return true;
    }
    return false;
  };

  const flushSection = () => {
    if (currentSection) {
      currentSection.content = contentBuffer.join("\n").trim();
      if (currentSection.content.length > 0 || currentSection.heading) {
        sections.push(currentSection);
      }
    }
    contentBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isHeading(trimmed)) {
      flushSection();
      // Clean heading text
      let heading = trimmed
        .replace(/^#{1,4}\s+/, "")
        .replace(/^(?:module|unit|chapter|section|part|topic)\s*[\d.:]+\s*[:\-–]?\s*/i, "")
        .replace(/^(\d+\.)\s*/, "")
        .trim();
      currentSection = { heading: heading || trimmed, content: "", subsections: [] };
    } else {
      if (!currentSection) {
        currentSection = { heading: "Introduction", content: "", subsections: [] };
      }
      contentBuffer.push(line);
    }
  }
  flushSection();

  if (sections.length === 0) {
    sections.push({
      heading: "Document Content",
      content: text.slice(0, 5000),
      subsections: []
    });
  }

  return {
    title: sections[0]?.heading || "Uploaded Document",
    sections
  };
}

/**
 * Uses Gemini API to parse document text into structured hierarchy.
 */
async function geminiParseDocumentStructure(text, apiKey) {
  // Truncate very long documents to avoid token limits
  const truncated = text.length > 15000 ? text.slice(0, 15000) : text;

  const promptText = `
You are an expert academic document parser. Analyze the following document text and extract its hierarchical structure.

The document could be: lecture notes, a syllabus, study material, a question bank, or previous year exam papers.

Extract the document structure as sections with headings and content. Identify:
- The overall document title (infer from content if not explicit)
- Major sections/modules/units/chapters
- Sub-sections where present

Return ONLY a valid JSON object matching this structure:
{
  "title": "Inferred or explicit document title",
  "sections": [
    {
      "heading": "Section heading / Module name",
      "content": "Text content within this section (include key sentences, definitions, questions)",
      "subsections": [
        {
          "heading": "Subsection heading",
          "content": "Subsection text content"
        }
      ]
    }
  ]
}

Rules:
- Preserve the original ordering of sections.
- Do NOT skip any sections. Include all content from the document.
- Keep content text meaningful. Include full sentences, not just keywords.
- If the document has no clear structure, create logical sections based on topic changes.
- Do not return any explanation or markdown formatting wrappers, return ONLY the raw JSON object.

---
DOCUMENT TEXT:
${truncated}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: promptText }] }]
    });

    const outputText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonStr = outputText.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);

    if (result && result.title && Array.isArray(result.sections)) {
      // Validate and clean sections
      return {
        title: result.title,
        sections: result.sections.map(s => ({
          heading: s.heading || "Untitled Section",
          content: s.content || "",
          subsections: Array.isArray(s.subsections) ? s.subsections.map(sub => ({
            heading: sub.heading || "",
            content: sub.content || ""
          })) : []
        }))
      };
    }
    throw new Error("Invalid structure from Gemini document parsing.");
  } catch (error) {
    console.error("Gemini Document Structure Parsing failed, using fallback. Error:", error.message);
    return fallbackParseDocumentStructure(text);
  }
}

/**
 * Main entry point for document structure parsing.
 * Returns a structured JSON hierarchy of the document.
 */
async function parseDocumentStructure(text) {
  const apiKey = envConfig.gemini.apiKey;
  if (apiKey && apiKey.trim() !== "") {
    console.log("Using Google Gemini API for document structure parsing...");
    return geminiParseDocumentStructure(text, apiKey);
  } else {
    console.log("No GEMINI_API_KEY detected. Using fallback rules-based document parsing...");
    return fallbackParseDocumentStructure(text);
  }
}

/**
 * ============================================
 * STAGE 1: TOPIC & CONCEPT EXTRACTION
 * ============================================
 * Accepts a parsed document structure (from parseDocumentStructure) and extracts
 * topics and raw concept candidates.
 */

/**
 * Rules-based parser to extract raw topics and concept candidates from parsed structure.
 * Serves as fallback when Gemini API key is missing.
 * @param {object|string} input - Parsed structure object or raw text (backward compatible)
 */
function fallbackExtractConcepts(input) {
  // Backward compatibility: accept raw text string
  let parsedStructure;
  if (typeof input === "string") {
    parsedStructure = fallbackParseDocumentStructure(input);
  } else {
    parsedStructure = input;
  }

  const topics = [];
  const concepts = [];
  const topicMap = new Map();

  for (const section of (parsedStructure.sections || [])) {
    const allContent = [
      section.content || "",
      ...(section.subsections || []).map(s => s.content || "")
    ].join("\n");

    if (allContent.trim().length < 20) continue;

    let topicName = section.heading || "General Studies";
    let topicDesc = `Study of ${topicName} and related concepts.`;
    let topicConfidence = 0.85;

    // Derive topic confidence from section structure
    if (section.heading && section.heading !== "Introduction" && section.heading !== "Document Content") {
      topicConfidence = 0.95; // Explicit heading = high confidence
    } else {
      topicConfidence = 0.70; // Inferred section = lower confidence
    }

    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, { description: topicDesc, confidence_score: topicConfidence });
    }

    // Extract concepts from section content
    const paragraphs = allContent.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length >= 20);

    for (const para of paragraphs) {
      let rawConceptName = para.slice(0, 50) + (para.length > 50 ? "..." : "");
      let learningObjective = "Understand the core concepts of: " + para.slice(0, 40);
      let difficulty = "Medium";
      let confidenceScore = 0.80;
      let extractionReason = "Extracted from section content as key study concept.";
      let sourceSnippet = para.slice(0, 150);

      if (/complexity|worst-case|sorting|searching|dsa|algorithm/i.test(para)) {
        rawConceptName = "Algorithm Complexity Analysis";
        learningObjective = "Understand and calculate the worst-case complexity of algorithms.";
        difficulty = "Medium";
        confidenceScore = 0.90;
        extractionReason = "Found algorithmic complexity markers in text.";
      } else if (/index|database|sql|query|b\+ tree/i.test(para)) {
        rawConceptName = "B+ Tree Indexing";
        learningObjective = "Explain B+ Tree index structures and their utility in range queries.";
        difficulty = "Hard";
        confidenceScore = 0.85;
        extractionReason = "Found indexing and database-related key terms in paragraph.";
      } else if (/arithmetic|addition|subtraction|math/i.test(para)) {
        rawConceptName = "Basic Math Operations";
        learningObjective = "Perform and parameterize standard arithmetic operations.";
        difficulty = "Easy";
        confidenceScore = 0.95;
        extractionReason = "Mathematical operators or arithmetic topics identified in input.";
      }

      concepts.push({
        topic_name: topicName,
        raw_concept: rawConceptName,
        learning_objective: learningObjective,
        difficulty,
        confidence_score: confidenceScore,
        extraction_reason: extractionReason,
        source_snippet: sourceSnippet
      });
    }
  }

  topicMap.forEach((data, name) => {
    topics.push({ topic_name: name, description: data.description, confidence_score: data.confidence_score });
  });

  if (topics.length === 0) {
    topics.push({ topic_name: "General Studies", description: "General study notes.", confidence_score: 0.60 });
    concepts.push({
      topic_name: "General Studies",
      raw_concept: "Overview of Core Topics",
      learning_objective: "Summarize and review key notes from uploaded document.",
      difficulty: "Medium",
      confidence_score: 0.75,
      extraction_reason: "Fallback concept generated.",
      source_snippet: (parsedStructure.sections?.[0]?.content || "").slice(0, 150)
    });
  }

  return { topics, concepts };
}

/**
 * Calls Gemini v1.5 API to extract structured topics and raw concepts from parsed document structure.
 * @param {object|string} input - Parsed structure object or raw text (backward compatible)
 */
async function geminiExtractConcepts(input, apiKey) {
  // Backward compatibility: accept raw text string
  let structureText;
  if (typeof input === "string") {
    structureText = input;
  } else {
    // Convert parsed structure to a readable format for the prompt
    structureText = `Document Title: ${input.title || "Unknown"}\n\n`;
    for (const section of (input.sections || [])) {
      structureText += `## ${section.heading}\n${section.content || ""}\n`;
      for (const sub of (section.subsections || [])) {
        structureText += `### ${sub.heading}\n${sub.content || ""}\n`;
      }
      structureText += "\n";
    }
  }

  const promptText = `
You are an expert academic curriculum parser. Your task is to analyze the structured document below (which could be notes, syllabus, study materials, question bank, or lecture content) and perform a structured extraction of educational topics and concepts.

The document has already been parsed into sections. Use the section headings to identify topics and the section content to identify concepts.

Please follow these guidelines:

1. Topic Extraction:
- Identify and extract high-level educational topics from the section headings and content.
- Provide a brief description for each topic.
- Assign a 'confidence_score' between 0.0 and 1.0 (1.0 = clearly identified from heading, 0.7 = inferred from content).
- Examples of topics: "Introduction to Artificial Intelligence", "Problem Solving in AI", "Knowledge Representation", "Machine Learning".

2. Concept Extraction:
- For each topic, extract specific concept candidates discussed in the text.
- Do NOT clean or normalize concept names yet. Extract them as they appear in the text or questions (these are 'raw_concept' values).
- For each concept, extract the exact/near 'source_snippet' from the text that mentions it.
- Draft a clear 'learning_objective' representing what a student should understand or be able to do.
- Suggest a 'difficulty' level: 'Easy', 'Medium', or 'Hard'.
- Assign a 'confidence_score' between 0.0 and 1.0.
- Provide an 'extraction_reason' explaining why this concept is important.

Return ONLY a valid JSON object matching this structure:
{
  "topics": [
    {
      "topic_name": "Topic Name",
      "description": "Brief description of the topic",
      "confidence_score": 0.95
    }
  ],
  "concepts": [
    {
      "topic_name": "Topic Name",
      "raw_concept": "Raw concept string (exactly as it appears or is questioned in text)",
      "learning_objective": "Assessment objective",
      "difficulty": "Easy" | "Medium" | "Hard",
      "confidence_score": 0.95,
      "extraction_reason": "Explanation of importance",
      "source_snippet": "Sentence or question text from the document where this concept was found"
    }
  ]
}

Do not return any explanation or markdown formatting wrappers, return ONLY the raw JSON object.

---
STRUCTURED DOCUMENT TO PROCESS:
${structureText}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: promptText
        }]
      }]
    });

    const outputText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonStr = outputText.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);

    if (result && Array.isArray(result.topics) && Array.isArray(result.concepts)) {
      return {
        topics: result.topics.map(t => ({
          topic_name: t.topic_name || "General",
          description: t.description || "",
          confidence_score: t.confidence_score !== undefined ? Math.max(0.0, Math.min(1.0, parseFloat(t.confidence_score))) : 0.80
        })),
        concepts: result.concepts.map(c => ({
          topic_name: c.topic_name || "General",
          raw_concept: c.raw_concept || c.concept || "Key Concept",
          learning_objective: c.learning_objective || "",
          difficulty: c.difficulty || "Medium",
          confidence_score: c.confidence_score !== undefined ? Math.max(0.0, Math.min(1.0, parseFloat(c.confidence_score))) : 1.0,
          extraction_reason: c.extraction_reason || "Extracted from document.",
          source_snippet: c.source_snippet || ""
        }))
      };
    }
    throw new Error("Invalid structured output format from LLM.");
  } catch (error) {
    console.error("Gemini structured extraction failed, using fallback rules-based extraction. Error:", error.message);
    return fallbackExtractConcepts(input);
  }
}

/**
 * Main service endpoint for structured topic and concept extraction.
 * @param {object|string} input - Parsed document structure or raw text
 */
async function extractConcepts(input) {
  const apiKey = envConfig.gemini.apiKey;
  if (apiKey && apiKey.trim() !== "") {
    console.log("Using Google Gemini API for structured topic and concept extraction...");
    return geminiExtractConcepts(input, apiKey);
  } else {
    console.log("No GEMINI_API_KEY detected. Using local rules-based fallback for structured extraction...");
    return fallbackExtractConcepts(input);
  }
}

/**
 * Programmatic fallback for concept normalization.
 */
function fallbackNormalizeConcepts(rawConcepts) {
  const results = [];
  const verbsRegex = /^(what\s+is|explain|discuss|define|compare|describe|solve|analyze|outline|evaluate|state|illustrate|explain\s+what\s+is|what\s+are|how\s+do\s+we|how\s+to|explain\s+how\s+to)\s+/i;

  for (const raw of rawConcepts) {
    let conceptStr = raw.raw_concept || raw.concept || "";
    // Remove question mark and punctuation noise
    conceptStr = conceptStr.replace(/[?.:;!]/g, "").trim();
    // Remove leading numbers (e.g. 1. 2. a))
    conceptStr = conceptStr.replace(/^\d+[\s.)-]+\s*/, "").trim();
    // Remove educational verbs at start
    conceptStr = conceptStr.replace(verbsRegex, "").trim();

    // Split by " and " / " or " / " vs " / " and "
    const parts = conceptStr.split(/\s+(?:and|or|vs|versus)\s+/i);
    for (const part of parts) {
      if (part.trim().length > 0) {
        results.push({
          ...raw,
          normalized_concept: part.trim()
        });
      }
    }
  }

  // Ensure every item has normalized_concept
  return results.map(r => ({
    ...r,
    normalized_concept: r.normalized_concept || r.raw_concept || r.concept
  }));
}

/**
 * Calls Gemini API to normalize a batch of raw concepts.
 */
async function geminiNormalizeConcepts(rawConcepts, apiKey) {
  const promptText = `
You are a precise academic curriculum parser. Your task is to normalize a list of raw concept strings into clean, noun-based educational entities.

For each concept in the list below:
1. Strip educational verbs (e.g. Define, Explain, Discuss, Describe, Compare, What is, Solve, Analyze).
2. Remove question wording, numbers (like 1., 2.), punctuation noise, and extra symbols.
3. Convert into a noun phrase.
4. If it is a compound concept (contains 'and', 'or', 'vs', etc.), split it into a JSON array of separate distinct concepts if they represent separate testable knowledge entities.

Return ONLY a valid JSON array of arrays of strings. Each element in the outer array must correspond EXACTLY to the raw concept at the same index, containing the list of normalized strings.
For example, if the input is:
[
  "What is Artificial Intelligence?",
  "Explain Forward Chaining and Backward Chaining",
  "Discuss Heuristic Functions used in A* Search"
]

The output must be:
[
  ["Artificial Intelligence"],
  ["Forward Chaining", "Backward Chaining"],
  ["Heuristic Functions", "A* Search"]
]

Do not return any explanation or markdown formatting wrappers, return ONLY the raw JSON array.

---
RAW CONCEPTS TO NORMALIZE:
${JSON.stringify(rawConcepts.map(c => c.raw_concept || c.concept))}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: promptText
        }]
      }]
    });

    const outputText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonStr = outputText.replace(/```json/g, "").replace(/```/g, "").trim();
    const normalizedLists = JSON.parse(jsonStr);

    if (Array.isArray(normalizedLists)) {
      const results = [];
      for (let i = 0; i < rawConcepts.length; i++) {
        const raw = rawConcepts[i];
        const normList = normalizedLists[i] || [raw.raw_concept || raw.concept];
        for (const norm of normList) {
          results.push({
            ...raw,
            normalized_concept: norm.trim()
          });
        }
      }
      return results;
    }
    throw new Error("Invalid output structure from LLM concept normalization.");
  } catch (error) {
    console.error("Gemini Concept Normalization failed, using fallback cleaning logic. Error:", error.message);
    return fallbackNormalizeConcepts(rawConcepts);
  }
}

/**
 * Main service endpoint for concept normalization layer.
 */
async function normalizeConcepts(rawConcepts) {
  const apiKey = envConfig.gemini.apiKey;
  if (apiKey && apiKey.trim() !== "") {
    console.log("Using Google Gemini API for concept normalization...");
    return geminiNormalizeConcepts(rawConcepts, apiKey);
  } else {
    console.log("No GEMINI_API_KEY detected. Using local rules-based fallback for normalization...");
    return fallbackNormalizeConcepts(rawConcepts);
  }
}

/**
 * Javascript deduplication logic.
 */
function deduplicateConcepts(concepts) {
  const unique = [];

  for (const c of concepts) {
    // Check if the concept name matches the topic name (topics must never be stored as concepts)
    if (c.topic_name && c.normalized_concept.toLowerCase() === c.topic_name.toLowerCase()) {
      console.log(`Skipping concept candidate '${c.normalized_concept}' because it matches the topic name.`);
      continue;
    }

    let matchIndex = -1;
    for (let i = 0; i < unique.length; i++) {
      const u = unique[i];
      if (shouldMerge(u.normalized_concept, c.normalized_concept)) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex >= 0) {
      const existing = unique[matchIndex];
      // Keep the longer name (e.g., "Artificial Intelligence" over "AI")
      if (c.normalized_concept.length > existing.normalized_concept.length) {
        existing.normalized_concept = c.normalized_concept;
      }
      // Keep higher confidence details
      if (c.confidence_score > existing.confidence_score) {
        existing.confidence_score = c.confidence_score;
        existing.difficulty = c.difficulty;
        existing.extraction_reason = c.extraction_reason;
        existing.source_snippet = c.source_snippet || existing.source_snippet;
      }
    } else {
      unique.push(c);
    }
  }

  return unique;
}

function shouldMerge(name1, name2) {
  const n1 = name1.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
  const n2 = name2.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");

  if (n1 === n2) return true;

  const getAcronym = (phrase) => {
    const words = phrase.split(/\s+/);
    if (words.length <= 1) return "";
    return words.map(w => w[0]).join("").toUpperCase();
  };

  const acr1 = getAcronym(n1);
  const acr2 = getAcronym(n2);

  const isAcronym = (acr, words) => {
    if (acr.length < 2 || words.length < 2) return false;
    if (acr.length !== words.length) return false;
    for (let i = 0; i < acr.length; i++) {
      if (acr[i] !== words[i][0]) return false;
    }
    return true;
  };

  const words1 = n1.split(/\s+/).filter(Boolean);
  const words2 = n2.split(/\s+/).filter(Boolean);

  if (words1.length === 1 && isAcronym(words1[0], words2)) return true;
  if (words2.length === 1 && isAcronym(words2[0], words1)) return true;

  // Exact custom acronym merge for AI vs Artificial Intelligence
  if ((n1 === "ai" && n2 === "artificial intelligence") || (n2 === "ai" && n1 === "artificial intelligence")) {
    return true;
  }

  return false;
}

/**
 * Rules-based generator to produce 2 blueprints (MCQ, Short Answer) for a concept candidate.
 * Serves as fallback when Gemini API key is missing.
 */
function fallbackGenerateBlueprintsForConcept(concept) {
  const mcqBlueprint = {
    title: `${concept.normalized_concept} Concept Check`,
    topic: concept.topic_name || "General",
    difficulty: concept.difficulty || "Medium",
    question_type: "multiple-choice",
    learning_objective: concept.learning_objective || "Recall key concepts.",
    template_text: `Which of the following best defines the concept of '{{concept}}'?`,
    options_templates: [
      `A core element designed to address the principles of {{concept}}`,
      `A random parameter not related to {{concept}}`,
      `An outdated standard superseded by other protocols`,
      `None of the above`
    ],
    correct_option_template: "0",
    variable_sets: {
      type: "explicit",
      sets: [
        {
          concept: concept.normalized_concept
        }
      ]
    },
    tags: [(concept.topic_name || "general").toLowerCase().replace(/\s+/g, "-"), "mcq"]
  };

  const shortAnswerBlueprint = {
    title: `${concept.normalized_concept} Explanation`,
    topic: concept.topic_name || "General",
    difficulty: concept.difficulty || "Medium",
    question_type: "short-answer",
    learning_objective: concept.learning_objective || "Explain key concepts.",
    template_text: `In the context of the curriculum, explain what '{{concept}}' is and its main objective.`,
    options_templates: [],
    correct_option_template: `A complete answer should define '{{concept}}' in detail and explain its core application.`,
    variable_sets: {
      type: "explicit",
      sets: [
        {
          concept: concept.normalized_concept
        }
      ]
    },
    tags: [(concept.topic_name || "general").toLowerCase().replace(/\s+/g, "-"), "short-answer"]
  };

  const bp1Scores = calculateScores(mcqBlueprint);
  const bp2Scores = calculateScores(shortAnswerBlueprint);

  return [
    {
      generated_json: mcqBlueprint,
      quality_score: bp1Scores.quality_score,
      confidence_score: bp1Scores.confidence_score
    },
    {
      generated_json: shortAnswerBlueprint,
      quality_score: bp2Scores.quality_score,
      confidence_score: bp2Scores.confidence_score
    }
  ];
}

/**
 * Calls Gemini v1.5 API to generate MCQ and Short Answer blueprints from concept details.
 */
async function geminiGenerateBlueprintsForConcept(concept, apiKey) {
  const promptText = `
You are an expert curriculum and assessment designer. Your task is to design two assessment blueprints (MCQ and Short Answer) for the following extracted and normalized concept.

CONCEPT DETAILS:
Topic: ${concept.topic_name || 'General'}
Concept: ${concept.normalized_concept}
Learning Objective: ${concept.learning_objective || 'Recall and define the concept.'}
Difficulty: ${concept.difficulty || 'Medium'}

Each blueprint MUST use dynamic variables/placeholders (e.g., {{variable}}) to allow generating unique questions.
Define variable_sets in one of two ways:
- For generator: type="generator", and define variables with min/max, e.g., "variables": { "A": { "min": 5, "max": 20 } }
- For explicit list: type="explicit", and define sets, e.g., "sets": [ { "var1": "value1", "var2": "value2" }, ... ]

The two blueprints to generate are:
1. "multiple-choice": A multiple-choice question. Must have exactly 4 options in options_templates. The correct_option_template must be the index string (e.g. '0', '1', '2', or '3') of the correct option.
2. "short-answer": A short answer question. Options templates can be empty or null. The correct_option_template should be a description/template of the expected correct answer.

Return ONLY a valid JSON array of 2 objects matching this structure:
[
  {
    "generated_json": {
      "title": "Blueprint title",
      "topic": "Concept topic",
      "difficulty": "Easy", "Medium", or "Hard",
      "question_type": "multiple-choice" or "short-answer",
      "learning_objective": "Learning objective to assess",
      "template_text": "Question template text with variables (e.g. 'What is the sum of {{X}} and {{Y}}?')",
      "options_templates": ["{{X+Y}}", "{{X*Y}}", "{{X-Y}}", "{{X+Y+2}}"],
      "correct_option_template": "0",
      "variable_sets": {
        "type": "generator" or "explicit",
        "variables": { ... },
        "sets": [ ... ]
      },
      "tags": ["tag1", "tag2"]
    },
    "quality_score": 90,
    "confidence_score": 0.95
  }
]

Do not return any explanation or markdown formatting wrappers, return ONLY the raw JSON array.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: promptText
        }]
      }]
    });

    const outputText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonStr = outputText.replace(/```json/g, "").replace(/```/g, "").trim();
    const blueprints = JSON.parse(jsonStr);

    if (Array.isArray(blueprints) && blueprints.length === 2) {
      return blueprints.map(bp => {
        // Enforce fallback scores if missing
        if (!bp.quality_score || !bp.confidence_score) {
          const scores = calculateScores(bp.generated_json || {});
          bp.quality_score = bp.quality_score || scores.quality_score;
          bp.confidence_score = bp.confidence_score || scores.confidence_score;
        }
        // ensure correct index format or defaults
        if (bp.generated_json) {
          if (!bp.generated_json.topic) bp.generated_json.topic = concept.topic_name || "General";
          if (!bp.generated_json.tags) bp.generated_json.tags = [(concept.topic_name || "general").toLowerCase().replace(/\s+/g, "-")];
        }
        return bp;
      });
    }
    throw new Error("Invalid output array length from LLM blueprint generation.");
  } catch (error) {
    console.error("Gemini Blueprint Generation call failed, falling back to rules-based generation. Error:", error.message);
    return fallbackGenerateBlueprintsForConcept(concept);
  }
}

/**
 * Main service endpoint for Stage 2 blueprint generation.
 */
async function generateBlueprintsForConcept(concept) {
  const apiKey = envConfig.gemini.apiKey;
  if (apiKey && apiKey.trim() !== "") {
    console.log("Using Google Gemini API for blueprint generation...");
    return geminiGenerateBlueprintsForConcept(concept, apiKey);
  } else {
    console.log("No GEMINI_API_KEY detected. Using local rules-based fallback for blueprint generation...");
    return fallbackGenerateBlueprintsForConcept(concept);
  }
}

module.exports = {
  parseDocumentStructure,
  extractConcepts,
  normalizeConcepts,
  deduplicateConcepts,
  generateBlueprintsForConcept,
  fallbackParseDocumentStructure,
  fallbackExtractConcepts,
  fallbackNormalizeConcepts,
  fallbackGenerateBlueprintsForConcept
};

/**
 * Seeded PRNG using mulberry32 algorithm.
 * Returns a function that produces pseudo-random floats in [0, 1).
 */
function createPRNG(seed) {
  let s = parseInt(seed, 10) || 12345;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Safe custom arithmetic expression parser.
 * Supports +, -, *, /, parenthesis, and numeric variables.
 * Explicitly avoids eval(), new Function(), vm, etc.
 */
function evaluateArithmetic(expr, variables) {
  // Replace variables with their values
  let resolved = expr;
  // Sort keys by length descending to prevent substring collision issues (e.g. A1 vs A)
  const sortedKeys = Object.keys(variables).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    resolved = resolved.replaceAll(key, String(variables[key]));
  }

  // Tokenize the expression: numbers (including floats), operators, parens
  const tokens = resolved.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(expected) {
    if (tokens[index] === expected) {
      index++;
      return true;
    }
    return false;
  }

  function parseExpression() {
    return parseAddSub();
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (true) {
      if (consume("+")) {
        left += parseMulDiv();
      } else if (consume("-")) {
        left -= parseMulDiv();
      } else {
        break;
      }
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePrimary();
    while (true) {
      if (consume("*")) {
        left *= parsePrimary();
      } else if (consume("/")) {
        const right = parsePrimary();
        left = right !== 0 ? left / right : 0; // Prevent division by zero
      } else {
        break;
      }
    }
    return left;
  }

  function parsePrimary() {
    const token = peek();
    if (consume("(")) {
      const val = parseExpression();
      consume(")");
      return val;
    }
    index++;
    const num = parseFloat(token);
    return isNaN(num) ? 0 : num;
  }

  try {
    const result = parseExpression();
    // Return float or integer representation
    return Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
  } catch (error) {
    console.error("Custom math parser error evaluating:", expr, error);
    return 0;
  }
}

/**
 * Interpolates a template text string by replacing placeholders like {{expression}}
 * with evaluated arithmetic values using the variables map.
 */
function interpolateTemplate(template, variables) {
  if (!template) return "";
  // Find all matches of {{ ... }}
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const cleanExpr = expression.trim();
    // If the expression is just a variable key, replace it directly
    if (variables[cleanExpr] !== undefined) {
      return String(variables[cleanExpr]);
    }
    // Otherwise, parse and evaluate it as an arithmetic expression
    return String(evaluateArithmetic(cleanExpr, variables));
  });
}

/**
 * Generates a unique question variant from a blueprint and seed.
 */
function generateVariant(blueprint, seed) {
  const seededRandom = createPRNG(seed);
  const varSets = blueprint.variable_sets || {};
  let selectedVars = {};

  // 1. Choose/Generate variables
  if (varSets.type === "explicit" && Array.isArray(varSets.sets) && varSets.sets.length > 0) {
    const idx = Math.floor(seededRandom() * varSets.sets.length);
    selectedVars = { ...varSets.sets[idx] };
  } else if (varSets.type === "generator" && varSets.variables) {
    for (const [name, config] of Object.entries(varSets.variables)) {
      if (config.min !== undefined && config.max !== undefined) {
        const min = parseInt(config.min, 10);
        const max = parseInt(config.max, 10);
        selectedVars[name] = min + Math.floor(seededRandom() * (max - min + 1));
      } else if (Array.isArray(config.choices) && config.choices.length > 0) {
        const idx = Math.floor(seededRandom() * config.choices.length);
        selectedVars[name] = config.choices[idx];
      } else {
        selectedVars[name] = 0; // Fallback
      }
    }
  }

  // 2. Interpolate question text
  const questionText = interpolateTemplate(blueprint.template_text, selectedVars);

  // 3. Interpolate options templates
  const options = (blueprint.options_templates || []).map((optTemplate) => {
    return interpolateTemplate(optTemplate, selectedVars);
  });

  // 4. Evaluate correct option template
  let correctOption = 0;
  const rawCorrectTemplate = blueprint.correct_option_template;

  // Check if correct template resolves directly to an option index (0, 1, 2, or 3)
  const resolvedCorrectStr = interpolateTemplate(rawCorrectTemplate, selectedVars);
  const directIdx = parseInt(resolvedCorrectStr, 10);
  if (!isNaN(directIdx) && directIdx >= 0 && directIdx < options.length) {
    correctOption = directIdx;
  } else {
    // If it's a value/expression result, check which evaluated option matches it
    const matchIdx = options.findIndex((opt) => opt === resolvedCorrectStr);
    if (matchIdx !== -1) {
      correctOption = matchIdx;
    }
  }

  return {
    questionText,
    options,
    correctOption,
    selectedVariables: selectedVars,
  };
}

module.exports = {
  createPRNG,
  evaluateArithmetic,
  interpolateTemplate,
  generateVariant,
};

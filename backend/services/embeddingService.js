/**
 * EmbeddingService: generates embeddings via OpenAI API
 */
const axios = require('axios');
const envConfig = require('../config/env');

const OPENAI_API_KEY = envConfig.openai.apiKey;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_URL = 'https://api.openai.com/v1/embeddings';

async function generateEmbedding(text) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: EMBEDDING_MODEL,
        input: text
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].embedding;
    }
    throw new Error('No embedding returned from OpenAI');
  } catch (err) {
    console.error('EmbeddingService generateEmbedding error:', err.message);
    throw err;
  }
}

async function generateEmbeddingBatch(texts) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: EMBEDDING_MODEL,
        input: texts
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.data.map(d => d.embedding);
  } catch (err) {
    console.error('EmbeddingService generateEmbeddingBatch error:', err.message);
    throw err;
  }
}

module.exports = { generateEmbedding, generateEmbeddingBatch };

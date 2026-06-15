/**
 * VectorService: Qdrant vector database operations
 */
const { QdrantClient } = require('@qdrant/js-client-rest');
const envConfig = require('../config/env');
const axios = require('axios');

const QDRANT_URL = envConfig.qdrant.url;
const COLLECTION_NAME = 'document_chunks';

async function createCollection() {
  try {
    await axios.put(
      `${QDRANT_URL}/collections/${COLLECTION_NAME}`,
      {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      }
    );
    console.log('VectorService: collection created or exists');
  } catch (err) {
    // Collection might already exist
    console.error('VectorService createCollection error:', err.response?.data || err.message);
  }
}

async function uploadVector(pointId, vector, payload) {
  try {
    await axios.put(
      `${QDRANT_URL}/collections/${COLLECTION_NAME}/points`,
      {
        points: [
          {
            id: pointId,
            vector: vector,
            payload: payload
          }
        ]
      }
    );
    return true;
  } catch (err) {
    console.error('VectorService uploadVector error:', err.message);
    throw err;
  }
}

async function uploadVectorBatch(points) {
  try {
    await axios.put(
      `${QDRANT_URL}/collections/${COLLECTION_NAME}/points`,
      { points }
    );
    return true;
  } catch (err) {
    console.error('VectorService uploadVectorBatch error:', err.message);
    throw err;
  }
}

async function searchVectors(queryVector, limit = 5) {
  try {
    const response = await axios.post(
      `${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`,
      {
        vector: queryVector,
        limit: limit,
        with_payload: true
      }
    );
    return response.data.result || [];
  } catch (err) {
    console.error('VectorService searchVectors error:', err.message);
    throw err;
  }
}

module.exports = {
  createCollection,
  uploadVector,
  uploadVectorBatch,
  searchVectors,
  COLLECTION_NAME
};

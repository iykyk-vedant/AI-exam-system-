# Environment Configuration Guide

## Overview
This project uses environment variables to manage sensitive configuration like API keys and database credentials. All environment variables are loaded from a `.env` file (which is **NOT committed** to version control for security).

## Setup Instructions

### 1. Create Your `.env` File

Copy the `.env.example` file to create your local `.env` file:

```bash
cp .env.example .env
```

### 2. Configure Your Environment Variables

Edit the `.env` file with your actual values:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@your-host:5432/secureexam_ai

# OpenAI API Configuration (Required)
OPENAI_API_KEY=sk-...

# Qdrant Vector Database Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_api_key_if_applicable

# Firebase Configuration (If using Firebase)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration (Change in production)
JWT_SECRET=your_strong_secret_key_here

# Application Configuration
APP_NAME=SECUREEXAM AI
APP_VERSION=1.0.0
```

## Required Environment Variables

### Production Environment
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `QDRANT_URL` - Qdrant vector database URL
- `JWT_SECRET` - JWT signing secret (keep secure!)

### Development Environment
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for embeddings

## Obtaining API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Create a new API key
4. Copy the key and add it to your `.env` file

### Qdrant API Key (Optional)
1. If using Qdrant Cloud, create an account at https://cloud.qdrant.io/
2. Create a cluster and copy the API key
3. Add to `.env` file

### Firebase Credentials
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project and go to Project Settings
3. Download the service account JSON
4. Extract credentials and add to `.env` file

## Security Best Practices

✅ **DO:**
- Keep `.env` file local and never commit it
- Use strong, unique secret keys in production
- Rotate API keys periodically
- Use different keys for development and production
- Store secrets in a secure vault for production (e.g., AWS Secrets Manager, HashiCorp Vault)

❌ **DON'T:**
- Commit `.env` file to version control
- Share API keys via Slack, email, or chat
- Use the same keys across environments
- Hardcode secrets in source code
- Log sensitive information

## Accessing Environment Variables in Code

Use the centralized configuration module:

```javascript
// In your code
const envConfig = require('./config/env');

// Access variables
const apiKey = envConfig.openai.apiKey;
const dbUrl = envConfig.database.url;
const port = envConfig.server.port;
```

## Environment Validation

The application automatically validates required environment variables on startup:
- **Development**: Warns if OPENAI_API_KEY is missing but continues
- **Production**: Throws an error if any required variable is missing

## Troubleshooting

### Error: "OPENAI_API_KEY not set"
- Ensure `.env` file exists and contains `OPENAI_API_KEY`
- Verify the key is correct and hasn't expired
- Restart your development server

### Error: "Missing required environment variables"
- Check that all required variables are set in `.env`
- Ensure no typos in variable names
- Verify the `.env` file is in the project root

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check database server is running
- Confirm user has proper permissions

## Deploying to Production

When deploying, use your hosting platform's secrets management:

**Heroku:**
```bash
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set DATABASE_URL=postgresql://...
```

**AWS:**
Use AWS Secrets Manager or Systems Manager Parameter Store

**Docker/Kubernetes:**
Use environment variables or secrets management

**Other Platforms:**
Refer to their documentation for managing environment variables

---

For more information, see the main README.md

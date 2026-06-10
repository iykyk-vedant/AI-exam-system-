# Blockchain-Based Examination & Credential Verification Platform

A comprehensive examination management system with blockchain-powered credential verification. This platform enables educational institutions to conduct secure online examinations, issue tamper-proof certificates, and provide instant verification capabilities through smart contracts on the Polygon blockchain.

## 🚀 Features

- **Secure Online Examinations**: Create and manage exams with customizable settings (duration, passing criteria, negative marking)
- **Role-Based Access Control**: Separate dashboards for Admin, Faculty, and Student users
- **Blockchain Credential Verification**: Issue certificates stored on Polygon blockchain with IPFS for document storage
- **Real-time Proctoring**: Monitor exam attempts with violation tracking
- **Instant Certificate Verification**: Public verification portal for employers and institutions
- **PDF Certificate Generation**: Auto-generated professional certificates with QR codes
- **Firebase Authentication**: Secure user authentication and authorization
- **Admin Analytics**: Comprehensive dashboard with system statistics and audit logs

## 📋 Architecture Overview

```
┌─────────────────────┐
│   React Frontend    │
│  (Vite + Tailwind)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Node.js Backend   │
│    (Express API)    │
└──────────┬──────────┘
           │
   ┌───────┼────────┐
   ▼       ▼        ▼
Postgres   Redis    IPFS
(Neon DB) (Upstash) (Pinata)
           │
           ▼
   Polygon Blockchain
      (Amoy Testnet)
           │
           ▼
    Smart Contracts
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **MetaMask** browser extension (for blockchain interactions)
- **PostgreSQL** client (optional, for direct database access)

### Required Accounts

- **Firebase Account**: Create a project at [firebase.google.com](https://firebase.google.com)
- **Neon PostgreSQL**: Sign up at [neon.tech](https://neon.tech) for managed PostgreSQL
- **Upstash Redis**: Sign up at [upstash.com](https://upstash.com) for Redis caching
- **Pinata IPFS**: Sign up at [pinata.cloud](https://pinata.cloud) for IPFS pinning
- **Alchemy Account**: Create an app at [alchemy.com](https://alchemy.com) for Polygon RPC access

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Examination-software
```

### 2. Smart Contract Setup (`/blockchain`)

Navigate to the blockchain directory:

```bash
cd blockchain
```

Install dependencies:

```bash
npm install
```

Configure environment variables in `blockchain/.env`:

```env
PRIVATE_KEY=your_wallet_private_key
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your_alchemy_api_key
```

Run tests to compile and verify the contract:

```bash
npx hardhat test
```

Deploy to Polygon Amoy Testnet:

```bash
npx hardhat run scripts/deploy.js --network amoy
```

**Important**: Copy the deployed contract address and save it for backend configuration.

### 3. Backend Setup (`/backend`)

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Configure environment variables in `backend/.env`:

```env
# Database connection
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Upstash Redis
REDIS_URL=rediss://default:password@host:6379

# Blockchain configs
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your_alchemy_api_key
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=<deployed_contract_address_from_step_2>

# IPFS Pinata
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY_URL=your_pinata_gateway

# Firebase Config (Backend Admin SDK)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----"
```

Start the backend server:

```bash
npm start
```

The server will run on `http://localhost:5000` and automatically initialize database tables.

### 4. Frontend Setup (`/frontend`)

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure environment variables in `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

---

## 1. Smart Contract Subsystem (`/blockchain`)

The smart contract is written in Solidity using Hardhat and OpenZeppelin. It allows only the platform owner (academic institution wallet) to issue credentials and verify them. It includes duplicate protection on both Certificate IDs and SHA-256 certificate PDF hashes.

### Contract Features

- **Owner-only credential issuance**: Only the contract owner can issue credentials
- **Duplicate protection**: Prevents duplicate certificate IDs and file hashes
- **IPFS integration**: Stores certificate CID for decentralized document storage
- **Verification functions**: Query by certificate ID or file hash

### Smart Contract Functions

- `issueCredential(string, string, string, string)`: Issues a new credential
- `getCredential(string)`: Retrieves credential by certificate ID
- `getCredentialByHash(string)`: Retrieves credential by file hash
- `verifyCredential(string)`: Verifies credential existence by hash

### Deployment to Polygon Amoy Testnet

1. **Fund the Deployer Wallet**: Visit the [Polygon Amoy Faucet](https://faucet.polygon.technology/) to request free test MATIC
2. Deploy the contract on the Amoy network:
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```
3. Copy the deployed contract address for backend configuration
4. (Optional) Verify the contract on Polygonscan:
   ```bash
   npx hardhat verify --network amoy <DEPLOYED_CONTRACT_ADDRESS>
   ```

---

## 2. Backend Service Subsystem (`/backend`)

A Node.js & Express server exposing REST APIs that interact with the smart contract (via Ethers.js) and persist certificate metadata in PostgreSQL.

### Database Schema

The backend automatically initializes the following tables:

- **certificates**: Stores issued certificates with blockchain references
- **users**: User account information and roles
- **exams**: Examination definitions and settings
- **questions**: Exam questions and options
- **exam_attempts**: Student exam attempts and results
- **verification_logs**: Certificate verification audit trail
- **system_settings**: Configurable system parameters

### Running the Server

```bash
cd backend
npm start
```

The server runs on `http://localhost:5000`

For development with auto-reload:

```bash
npm run dev
```

---

## 3. Frontend Application (`/frontend`)

A React-based single-page application built with Vite, TailwindCSS, and Firebase Authentication.

### Pages & Features

- **Login/Signup**: Firebase authentication with email/password
- **Admin Dashboard**: System statistics, user management, audit logs
- **Faculty Dashboard**: Create exams, manage questions, view results
- **Student Dashboard**: View available exams, attempt exams, view certificates
- **Verification Portal**: Public certificate verification by ID or hash
- **Exam Interface**: Timed exam taking with real-time submission

### Running the Frontend

```bash
cd frontend
npm run dev
```

The application runs on `http://localhost:5173`

For production build:

```bash
npm run build
npm run preview
```

---

## 4. API Endpoints

### Store Credential
- **Method**: `POST`
- **Route**: `/api/blockchain/store`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "certificateId": "CERT-2026-001",
    "firebaseUid": "some-firebase-uid",
    "studentName": "John Doe",
    "certificateHash": "6e34ac8a9d458641a9bb7538a7bde25df963c87e076615b5eb0bc23b20757a3e",
    "ipfsCid": "QmZt8LzN23tG9hN6r4mFvWnLopq1234abc"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Credential successfully registered on blockchain and saved in database.",
    "data": {
      "success": true,
      "transactionHash": "0xabc...",
      "blockNumber": 12345,
      "record": {
        "id": "uuid-value",
        "certificate_id": "CERT-2026-001",
        "firebase_uid": "some-firebase-uid",
        "student_name": "John Doe",
        "certificate_hash": "6e34ac8a9d458641a9bb7538a7bde25df963c87e076615b5eb0bc23b20757a3e",
        "ipfs_cid": "QmZt8LzN23tG9hN6r4mFvWnLopq1234abc",
        "blockchain_tx_hash": "0xabc...",
        "issued_at": "2026-06-09T06:00:00.000Z"
      }
    }
  }
  ```

### Verify Credential
- **Method**: `POST`
- **Route**: `/api/blockchain/verify`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "certificateHash": "6e34ac8a9d458641a9bb7538a7bde25df963c87e076615b5eb0bc23b20757a3e"
  }
  ```
- **Response (Verified)**:
  ```json
  {
    "verified": true,
    "certificateId": "CERT-2026-001",
    "firebaseUid": "some-firebase-uid",
    "studentName": "John Doe",
    "ipfsCid": "QmZt8LzN23tG9hN6r4mFvWnLopq1234abc",
    "issuedAt": 1749000000,
    "issuer": "0x8a848108029b4193733C6beF2cd046c047eB56Ec",
    "transactionHash": "0xabc..."
  }
  ```
- **Response (Unverified)**:
  ```json
  {
    "verified": false,
    "message": "No matching record found on the blockchain."
  }
  ```

### Get Credential By ID
- **Method**: `GET`
- **Route**: `/api/blockchain/credential/:id`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "certificateId": "CERT-2026-001",
      "firebaseUid": "some-firebase-uid",
      "studentName": "John Doe",
      "certificateHash": "6e34ac8a9d458641a9bb7538a7bde25df963c87e076615b5eb0bc23b20757a3e",
      "ipfsCid": "QmZt8LzN23tG9hN6r4mFvWnLopq1234abc",
      "issuedAt": 1749000000,
      "issuer": "0x8a848108029b4193733C6beF2cd046c047eB56Ec",
      "transactionHash": "0xabc..."
    }
  }
  ```

### Certificate Endpoints

#### Generate Certificate Preview
- **Method**: `POST`
- **Route**: `/api/certificate/generate`
- **Description**: Generate a PDF certificate preview
- **Request Body**: Certificate details (student name, course, CGPA, etc.)

#### Issue Certificate
- **Method**: `POST`
- **Route**: `/api/certificate/issue`
- **Description**: Issue and store certificate on blockchain
- **Request Body**: Certificate data with blockchain transaction

#### Download Certificate
- **Method**: `GET`
- **Route**: `/api/certificate/:id/download`
- **Description**: Download certificate PDF by ID

#### Verify Certificate By ID
- **Method**: `GET`
- **Route**: `/api/verify/:certificateId`
- **Description**: Public verification endpoint for certificates

#### Get Student Certificates
- **Method**: `GET`
- **Route**: `/api/certificate/student/:firebaseUid`
- **Description**: Retrieve all certificates for a student

### Authentication Endpoints

#### Register User
- **Method**: `POST`
- **Route**: `/api/auth/register`
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Request Body**: User role and additional information

#### Login User
- **Method**: `POST`
- **Route**: `/api/auth/login`
- **Headers**: `Authorization: Bearer <firebase-token>`

#### Get Current User
- **Method**: `GET`
- **Route**: `/api/auth/me`
- **Headers**: `Authorization: Bearer <firebase-token>`

### Exam Endpoints

#### Create Exam
- **Method**: `POST`
- **Route**: `/api/exams`
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Request Body**: Exam title, description, duration, passing percentage, etc.

#### Add Questions to Exam
- **Method**: `POST`
- **Route**: `/api/exams/:examId/questions`
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Request Body**: Array of questions with options and correct answers

#### Update Exam Status
- **Method**: `POST`
- **Route**: `/api/exams/:examId/status`
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Request Body**: Status (draft, published, closed)

#### Get All Exams
- **Method**: `GET`
- **Route**: `/api/exams`
- **Headers**: `Authorization: Bearer <firebase-token>`

#### Get Exam Details
- **Method**: `GET`
- **Route**: `/api/exams/:examId`
- **Headers**: `Authorization: Bearer <firebase-token>`

#### Submit Exam
- **Method**: `POST`
- **Route**: `/api/exams/:examId/submit`
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Request Body**: Student answers

#### Get Exam Results
- **Method**: `GET`
- **Route**: `/api/exams/:examId/results`
- **Headers**: `Authorization: Bearer <firebase-token>`

#### Get Student Attempts
- **Method**: `GET`
- **Route**: `/api/students/attempts`
- **Headers**: `Authorization: Bearer <firebase-token>`

### Admin Endpoints

#### Get Admin Statistics
- **Method**: `GET`
- **Route**: `/api/admin/stats`
- **Headers**: `Authorization: Bearer <firebase-token>` (Admin only)
- **Description**: System-wide statistics and metrics

#### Get Node Diagnostics
- **Method**: `GET`
- **Route**: `/api/admin/node-status`
- **Headers**: `Authorization: Bearer <firebase-token>` (Admin only)
- **Description**: Blockchain node and system health status

#### Get System Settings
- **Method**: `GET`
- **Route**: `/api/admin/settings`
- **Headers**: `Authorization: Bearer <firebase-token>` (Admin only)

#### Update System Setting
- **Method**: `POST`
- **Route**: `/api/admin/settings`
- **Headers**: `Authorization: Bearer <firebase-token>` (Admin only)
- **Request Body**: Setting key and value

#### Export Audit CSV
- **Method**: `GET`
- **Route**: `/api/admin/export/:type`
- **Headers**: `Authorization: Bearer <firebase-token>` (Admin only)
- **Description**: Export audit logs as CSV

---

## 5. Usage Guide

### For Administrators

1. **Setup System**: Configure institution name and system settings
2. **Manage Users**: Monitor user registrations and roles
3. **View Analytics**: Access comprehensive system statistics
4. **Audit Logs**: Review verification logs and system activity
5. **Export Data**: Generate CSV reports for compliance

### For Faculty

1. **Create Exams**: Design examinations with custom parameters
2. **Add Questions**: Upload questions with multiple-choice options
3. **Publish Exams**: Make exams available to students
4. **Review Results**: Analyze student performance and scores
5. **Issue Certificates**: Generate blockchain-verified certificates

### For Students

1. **Register**: Sign up with email and password
2. **Browse Exams**: View available examinations
3. **Take Exams**: Complete timed assessments online
4. **View Results**: Access scores and performance metrics
5. **Download Certificates**: Obtain verified certificates

### For Verifiers

1. **Access Portal**: Use public verification page
2. **Enter Certificate ID**: Input certificate identifier
3. **Verify Instantly**: Get real-time blockchain verification
4. **View Details**: Access certificate metadata and issuer info

---

## 6. Troubleshooting

### Common Issues

#### Blockchain Transaction Failed
- **Cause**: Insufficient MATIC balance or network congestion
- **Solution**: Fund wallet with test MATIC from faucet, retry transaction

#### Database Connection Error
- **Cause**: Invalid DATABASE_URL or network issues
- **Solution**: Verify Neon DB credentials, check SSL settings

#### Firebase Authentication Error
- **Cause**: Invalid API keys or configuration
- **Solution**: Verify Firebase project settings, check API key format

#### IPFS Upload Failed
- **Cause**: Invalid Pinata credentials or API limits
- **Solution**: Verify Pinata API keys, check account status

#### Smart Contract Verification Failed
- **Cause**: Contract constructor parameters mismatch
- **Solution**: Verify constructor arguments match deployment

### Development Tips

- Use `npm run dev` in backend for auto-reload during development
- Check browser console for frontend errors
- Review server logs for backend issues
- Use Hardhat console for smart contract testing
- Verify environment variables are properly set

---

## 7. Security Considerations

- **Never commit** `.env` files or private keys to version control
- **Use environment variables** for all sensitive configuration
- **Enable SSL** for production deployments
- **Implement rate limiting** on public API endpoints
- **Regularly update** dependencies for security patches
- **Use hardware wallets** for mainnet deployments
- **Audit smart contracts** before mainnet deployment

---

## 8. Project Structure

```
Examination-software/
├── blockchain/
│   ├── contracts/
│   │   └── CredentialRegistry.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── CredentialRegistry.test.js
│   ├── hardhat.config.js
│   └── package.json
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── blockchainController.js
│   │   ├── certificateController.js
│   │   ├── authController.js
│   │   ├── examController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── services/
│   │   ├── blockchainService.js
│   │   ├── ipfsService.js
│   │   └── certificateService.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── firebase.js
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 9. Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 10. License

This project is licensed under the MIT License.

---

## 11. Support

For support and questions:

- **Email**: unmeshbhangaale41@gmail.com
- **Issues**: Open an issue on GitHub
- **Documentation**: Check this README and inline code comments

---

## 12. Roadmap

Future enhancements planned:

- [ ] Multi-language support
- [ ] Mobile application
- [ ] Advanced proctoring with AI
- [ ] Integration with learning management systems
- [ ] Mainnet deployment on Polygon
- [ ] NFT certificate integration
- [ ] Advanced analytics dashboard
- [ ] Bulk certificate generation
- [ ] Email notifications for certificates
- [ ] Custom certificate templates

---

**Built with ❤️ for secure and verifiable academic credentials**

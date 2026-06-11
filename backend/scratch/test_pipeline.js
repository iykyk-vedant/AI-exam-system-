const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BACKEND_URL = "http://127.0.0.1:5000";
const AUTH_HEADERS = {
  headers: {
    Authorization: "Bearer mock-faculty-token"
  }
};

async function setupDatabaseUser() {
  console.log("\n--- Setting up mock database user via API register ---");
  try {
    const registerRes = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      name: "Test Faculty",
      role: "faculty"
    }, AUTH_HEADERS);
    console.log("Mock faculty user registration success:", registerRes.data.message);
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log("Mock faculty user registration returned 403, might already be registered as admin or other check. Proceeding...");
    } else {
      console.log("Mock faculty user registration info:", err.message);
    }
  }
}

async function run() {
  try {
    await setupDatabaseUser();

    console.log("\n--- Creating mock study notes file ---");
    const testFileName = "test_notes.txt";
    const testFileContent = `
=== Advanced Database Indexing ===
In relational database design, query optimization is heavily reliant on indexing.
A B+ Tree is a self-balancing tree data structure that keeps data sorted and allows searches, sequential access, insertions, and deletions in logarithmic time.
The B+ Tree is optimized for systems that read and write large blocks of data.
It is commonly used in databases and operating system file systems.
Unlike a standard B-tree, all key-value records are stored in the leaf nodes, while the internal nodes store keys to route the search.
Leaf nodes are chained together as a linked list, allowing efficient range queries and sequential scanning.

=== Algorithm Time Complexity ===
Sorting is a fundamental operation.
Merge Sort is a divide-and-conquer algorithm with a worst-case time complexity of O(N log N).
Binary Search is a search algorithm that finds the position of a target value within a sorted array, running in O(log N) worst-case time.
`;
    const tempFilePath = path.join(__dirname, "../uploads", testFileName);
    if (!fs.existsSync(path.dirname(tempFilePath))) {
      fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
    }
    fs.writeFileSync(tempFilePath, testFileContent, "utf8");
    console.log(`Mock file created at: ${tempFilePath}`);

    console.log("\n--- Step 1: Uploading Question Bank Document ---");
    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", fs.createReadStream(tempFilePath));

    const uploadRes = await axios.post(`${BACKEND_URL}/api/question-bank/upload`, form, {
      headers: {
        ...AUTH_HEADERS.headers,
        ...form.getHeaders()
      }
    });

    console.log("Upload response status:", uploadRes.status);
    console.log("Upload response data:", JSON.stringify(uploadRes.data, null, 2));
    
    if (!uploadRes.data.success || !uploadRes.data.data.id) {
      throw new Error("Upload failed!");
    }
    const documentId = uploadRes.data.data.id;

    console.log("\n--- Step 2: Processing Document (Stage 1: Concept Extraction) ---");
    const processRes = await axios.post(`${BACKEND_URL}/api/question-bank/process`, {
      documentId
    }, AUTH_HEADERS);

    console.log("Process response status:", processRes.status);
    console.log("Process response report:", JSON.stringify(processRes.data.report, null, 2));

    if (!processRes.data.success) {
      throw new Error("Processing failed!");
    }

    console.log("\n--- Step 3: Fetching Concept Candidates ---");
    const conceptsRes = await axios.get(`${BACKEND_URL}/api/concept-candidates`, AUTH_HEADERS);
    console.log("Concepts found count:", conceptsRes.data.data.length);
    if (conceptsRes.data.data.length === 0) {
      throw new Error("No concepts were extracted!");
    }

    const testConcept = conceptsRes.data.data.find(c => c.source_document_id === documentId);
    if (!testConcept) {
      throw new Error("Could not find generated concept for our test document!");
    }

    console.log("Test Concept ID:", testConcept.id);
    console.log("Extracted Concept:", testConcept.concept);
    console.log("Topic:", testConcept.topic);
    console.log("Subtopic:", testConcept.subtopic);
    console.log("Confidence Score:", testConcept.confidence_score);
    console.log("Reason for Extraction:", testConcept.extraction_reason);

    console.log("\n--- Step 4: Editing Concept Details ---");
    const editRes = await axios.put(`${BACKEND_URL}/api/concept-candidates/${testConcept.id}`, {
      topic: testConcept.topic,
      subtopic: "B+ Tree Leaf Chaining",
      concept: "Leaf node chaining in B+ Trees",
      learning_objective: "Describe how link pointers in leaf nodes facilitate rapid range queries.",
      difficulty: "Hard",
      confidence_score: 0.98,
      extraction_reason: "Critical database optimization mechanism"
    }, AUTH_HEADERS);

    console.log("Edit response status:", editRes.status);
    console.log("Edited Concept:", editRes.data.data.concept);
    console.log("Edited Subtopic:", editRes.data.data.subtopic);

    console.log("\n--- Step 5: Approving Concept ---");
    const approveConceptRes = await axios.post(`${BACKEND_URL}/api/concept-candidates/${testConcept.id}/approve`, {}, AUTH_HEADERS);
    console.log("Approve concept status:", approveConceptRes.status);
    console.log("Approved Concept Details:", JSON.stringify(approveConceptRes.data.data, null, 2));

    if (!approveConceptRes.data.success || approveConceptRes.data.data.status !== "APPROVED") {
      throw new Error("Concept approval failed!");
    }

    console.log("\n--- Step 6: Generating Blueprints from Concept Bulk (Stage 2) ---");
    const genBpsRes = await axios.post(`${BACKEND_URL}/api/concept-candidates/generate-blueprints-bulk`, {
      conceptIds: [testConcept.id]
    }, AUTH_HEADERS);
    console.log("Generate blueprints bulk response status:", genBpsRes.status);
    console.log("Generate blueprints bulk response data:", JSON.stringify(genBpsRes.data, null, 2));

    if (!genBpsRes.data.success || genBpsRes.data.processed !== 1 || genBpsRes.data.generated !== 2) {
      throw new Error("Bulk blueprint generation failed or did not yield 2 blueprints!");
    }

    // Fetch blueprint candidates for downstream verification
    const candidatesRes = await axios.get(`${BACKEND_URL}/api/blueprint-candidates`, AUTH_HEADERS);
    console.log("Candidates returned count:", candidatesRes.data.data.length);

    const mcqBlueprint = candidatesRes.data.data.find(bp => bp.generated_json.question_type === "multiple-choice");
    const shortAnswerBlueprint = candidatesRes.data.data.find(bp => bp.generated_json.question_type === "short-answer");

    console.log("Extracted MCQ blueprint:", JSON.stringify(mcqBlueprint, null, 2));
    console.log("Extracted Short Answer blueprint:", JSON.stringify(shortAnswerBlueprint, null, 2));

    console.log("\n--- Step 7: Previewing Blueprint Candidate Variants (3 Seeds) ---");
    const previewRes = await axios.post(`${BACKEND_URL}/api/blueprint-candidates/${mcqBlueprint.id}/preview`, {}, AUTH_HEADERS);
    console.log("Preview variants status:", previewRes.status);
    console.log("Generated Variants count:", previewRes.data.variants.length);
    console.log("Variant Previews:", JSON.stringify(previewRes.data.variants, null, 2));

    if (!previewRes.data.variants || previewRes.data.variants.length !== 3) {
      throw new Error("Variant preview failed to produce exactly 3 seeds!");
    }

    console.log("\n--- Step 8: Approving MCQ Blueprint Candidate into Library ---");
    const approveBpRes = await axios.post(`${BACKEND_URL}/api/blueprint-candidates/${mcqBlueprint.id}/approve`, {}, AUTH_HEADERS);
    console.log("Approve blueprint status:", approveBpRes.status);
    console.log("Approved Blueprint Details:", JSON.stringify(approveBpRes.data.data, null, 2));

    if (!approveBpRes.data.success) {
      throw new Error("Blueprint candidate approval failed!");
    }

    console.log("\n--- Step 9: Verifying Blueprint presence in Library ---");
    const libraryRes = await axios.get(`${BACKEND_URL}/api/blueprints`, AUTH_HEADERS);
    const addedBlueprint = libraryRes.data.data.find(bp => bp.id === approveBpRes.data.data.id);
    if (!addedBlueprint) {
      throw new Error("Approved blueprint not found in the blueprint library!");
    }
    console.log("Verified! Blueprint is present in library with title:", addedBlueprint.title);

    console.log("\n--- Step 10: Rejecting remaining pending blueprint candidates ---");
    const rejectAllRes = await axios.post(`${BACKEND_URL}/api/blueprint-candidates/reject-all`, {}, AUTH_HEADERS);
    console.log("Reject all candidates response:", JSON.stringify(rejectAllRes.data, null, 2));

    if (!rejectAllRes.data.success) {
      throw new Error("Bulk rejection endpoint failed!");
    }

    console.log("\n=== ALL TWO-STAGE PIPELINE TESTS PASSED SUCCESSFULLY ===");

  } catch (err) {
    console.error("\n❌ TWO-STAGE PIPELINE TEST FAILED:");
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
    process.exit(1);
  } finally {
    // Cleanup physical files
    try {
      fs.unlinkSync(tempFilePath);
    } catch (_) {}
    process.exit(0);
  }
}

run();

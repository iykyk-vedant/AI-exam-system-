import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, getAuthHeaders } from "../context/AuthContext";
import { 
  Award, 
  User, 
  LogOut, 
  Plus, 
  Calendar, 
  FileText, 
  Trash2, 
  Check, 
  Users, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Eye,
  Settings,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Loader2,
  Upload,
  X
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function FacultyDashboard() {
  const { currentUser, profileName, logout } = useAuth();

  // State Management
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("list"); // 'list', 'create', 'add-questions', 'results', 'blueprints'
  
  // Selected Exam Context
  const [selectedExam, setSelectedExam] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Blueprint CRUD States
  const [blueprints, setBlueprints] = useState([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState(null); // null for create, object for edit
  const [blueprintTitle, setBlueprintTitle] = useState("");
  const [blueprintTopic, setBlueprintTopic] = useState("");
  const [blueprintDifficulty, setBlueprintDifficulty] = useState("Medium");
  const [blueprintType, setBlueprintType] = useState("multiple-choice");
  const [blueprintObjective, setBlueprintObjective] = useState("");
  const [blueprintTemplateText, setBlueprintTemplateText] = useState("");
  const [blueprintOptionsTemplates, setBlueprintOptionsTemplates] = useState(["", "", "", ""]);
  const [blueprintCorrectTemplate, setBlueprintCorrectTemplate] = useState("0");
  const [blueprintVarType, setBlueprintVarType] = useState("explicit");
  const [blueprintVarSets, setBlueprintVarSets] = useState(JSON.stringify({
    type: "explicit",
    sets: [
      { "A": 10, "B": 20 },
      { "A": 15, "B": 25 }
    ]
  }, null, 2));
  const [blueprintTags, setBlueprintTags] = useState("");
  const [blueprintPreview, setBlueprintPreview] = useState(null);
  const [blueprintPreviewError, setBlueprintPreviewError] = useState("");
  const [blueprintPreviewLoading, setBlueprintPreviewLoading] = useState(false);
  const [selectedBlueprintIds, setSelectedBlueprintIds] = useState([]); // Selected blueprints for active exam

  // Question Bank Upload & Processing states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [documents, setDocuments] = useState([]);
  const [blueprintSubTab, setBlueprintSubTab] = useState("library");

  // Concept Candidates states
  const [concepts, setConcepts] = useState([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [editingConcept, setEditingConcept] = useState(null);
  const [conceptTopic, setConceptTopic] = useState("");
  const [conceptSubtopic, setConceptSubtopic] = useState("");
  const [conceptName, setConceptName] = useState("");
  const [conceptRaw, setConceptRaw] = useState("");
  const [conceptSnippet, setConceptSnippet] = useState("");
  const [conceptObjective, setConceptObjective] = useState("");
  const [conceptDifficulty, setConceptDifficulty] = useState("Medium");
  const [conceptConfidence, setConceptConfidence] = useState(1.0);
  const [conceptReason, setConceptReason] = useState("");
  const [generatingBlueprintsId, setGeneratingBlueprintsId] = useState(null);
  const [selectedConceptIds, setSelectedConceptIds] = useState([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Topics states
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Blueprint Candidates states
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candPreviews, setCandPreviews] = useState({});
  const [candPreviewLoading, setCandPreviewLoading] = useState({});

  // Editing Candidates states
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candTitle, setCandTitle] = useState("");
  const [candTopic, setCandTopic] = useState("");
  const [candDifficulty, setCandDifficulty] = useState("Medium");
  const [candType, setCandType] = useState("multiple-choice");
  const [candObjective, setCandObjective] = useState("");
  const [candTemplateText, setCandTemplateText] = useState("");
  const [candOptionsTemplates, setCandOptionsTemplates] = useState(["", "", "", ""]);
  const [candCorrectTemplate, setCandCorrectTemplate] = useState("0");
  const [candVarSets, setCandVarSets] = useState("");
  const [candTags, setCandTags] = useState("");

  // Form States - Create Exam
  const [examTitle, setExamTitle] = useState("");
  const [examDesc, setExamDesc] = useState("");
  const [passingPercentage, setPassingPercentage] = useState("50");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [negativeMarking, setNegativeMarking] = useState("0.00");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Form States - Add Questions (Stated for compatibility, but we link blueprints instead)
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("0");
  const [tempQuestions, setTempQuestions] = useState([]); // Questions staged locally before submission

  // Fetch all blueprints
  const fetchBlueprints = async () => {
    setBlueprintsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/blueprints`, headers);
      if (response.data.success) {
        setBlueprints(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch blueprints.");
    } finally {
      setBlueprintsLoading(false);
    }
  };

  // Fetch all documents / reports
  const fetchDocuments = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/question-bank/documents`, headers);
      if (response.data.success) {
        setDocuments(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all candidates pending review
  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/blueprint-candidates`, headers);
      if (response.data.success) {
        setCandidates(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch blueprint candidates.");
    } finally {
      setCandidatesLoading(false);
    }
  };

  // Fetch all concept candidates
  const fetchConcepts = async () => {
    setConceptsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/concept-candidates`, headers);
      if (response.data.success) {
        setConcepts(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch concept candidates.");
    } finally {
      setConceptsLoading(false);
    }
  };

  // Fetch all extracted topics
  const fetchTopics = async () => {
    setTopicsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/topics`, headers);
      if (response.data.success) {
        setTopics(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch topics.");
    } finally {
      setTopicsLoading(false);
    }
  };

  // Delete a topic
  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Delete this topic? All linked concepts will also be removed.")) return;
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/api/topics/${topicId}`, headers);
      setTopics(prev => prev.filter(t => t.id !== topicId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete topic.");
    }
  };

  // Approve concept candidate
  const handleApproveConcept = async (conceptId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/concept-candidates/${conceptId}/approve`, {}, headers);
      if (response.data.success) {
        alert("Concept approved! You can now generate blueprint candidates for it.");
        await fetchConcepts();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to approve concept candidate.");
    }
  };

  // Reject concept candidate
  const handleRejectConcept = async (conceptId) => {
    if (!window.confirm("Are you sure you want to reject this concept candidate?")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/concept-candidates/${conceptId}/reject`, {}, headers);
      if (response.data.success) {
        await fetchConcepts();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reject concept candidate.");
    }
  };

  // Reject all concept candidates
  const handleRejectAllConcepts = async () => {
    if (!window.confirm("Are you sure you want to reject all pending concept candidates?")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/concept-candidates/reject-all`, {}, headers);
      if (response.data.success) {
        alert(response.data.message);
        await fetchConcepts();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reject all concept candidates.");
    }
  };

  // Generate blueprints from approved concept candidate (Stage 2)
  const handleGenerateBlueprints = async (conceptId) => {
    setGeneratingBlueprintsId(conceptId);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/concept-candidates/${conceptId}/generate-blueprints`, {}, headers);
      if (response.data.success) {
        alert("Blueprint candidates (MCQ and Short Answer) generated successfully!");
        await fetchCandidates();
        setBlueprintSubTab("review-blueprints");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to generate blueprints from concept.");
    } finally {
      setGeneratingBlueprintsId(null);
    }
  };

  // Generate blueprints in bulk for multiple approved concept candidates (Change 5)
  const handleGenerateBlueprintsBulk = async () => {
    if (selectedConceptIds.length === 0) {
      alert("Please select at least one approved concept candidate.");
      return;
    }
    setBulkGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/concept-candidates/generate-blueprints-bulk`,
        { conceptIds: selectedConceptIds },
        headers
      );
      if (response.data.success) {
        alert(`Bulk blueprint generation complete!\nProcessed: ${response.data.processed}\nGenerated: ${response.data.generated}\nFailed: ${response.data.failed}`);
        setSelectedConceptIds([]);
        await fetchCandidates();
        setBlueprintSubTab("review-blueprints");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Bulk blueprint generation failed.");
    } finally {
      setBulkGenerating(false);
    }
  };

  // Reject all pending blueprint candidates
  const handleRejectAllCandidates = async () => {
    if (!window.confirm("Are you sure you want to reject all pending blueprint candidates?")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/blueprint-candidates/reject-all`, {}, headers);
      if (response.data.success) {
        alert(response.data.message);
        await fetchCandidates();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reject all blueprint candidates.");
    }
  };

  // Upload and process bank document
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setUploadStatus("Uploading file to server...");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const headers = await getAuthHeaders();
      const uploadRes = await axios.post(`${API_BASE_URL}/api/question-bank/upload`, formData, {
        headers: {
          ...headers.headers,
          "Content-Type": "multipart/form-data"
        }
      });

      if (uploadRes.data.success) {
        const doc = uploadRes.data.data;
        setUploadStatus("Extracting content and generating blueprint candidates...");
        
        const processRes = await axios.post(`${API_BASE_URL}/api/question-bank/process`, {
          documentId: doc.id
        }, headers);

        if (processRes.data.success) {
          setUploadStatus("Processing completed successfully!");
          setUploadFile(null);
          await fetchDocuments();
          setTimeout(() => {
            setBlueprintSubTab("review-concepts");
            fetchConcepts();
          }, 1000);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.details || "File processing failed.");
      setUploadStatus("Processing failed.");
    } finally {
      setUploading(false);
    }
  };

  // Approve blueprint candidate
  const handleApproveCandidate = async (candId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/blueprint-candidates/${candId}/approve`, {}, headers);
      if (response.data.success) {
        alert("Candidate approved and added to library!");
        await fetchCandidates();
        await fetchBlueprints();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to approve blueprint candidate.");
    }
  };

  // Reject blueprint candidate
  const handleRejectCandidate = async (candId) => {
    if (!window.confirm("Are you sure you want to reject this candidate?")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/blueprint-candidates/${candId}/reject`, {}, headers);
      if (response.data.success) {
        await fetchCandidates();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reject blueprint candidate.");
    }
  };

  // Preview candidate variants
  const handlePreviewCandidate = async (candId) => {
    setCandPreviewLoading(prev => ({ ...prev, [candId]: true }));
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/blueprint-candidates/${candId}/preview`, {}, headers);
      if (response.data.success) {
        setCandPreviews(prev => ({ ...prev, [candId]: response.data.variants }));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate preview variants.");
    } finally {
      setCandPreviewLoading(prev => ({ ...prev, [candId]: false }));
    }
  };

  const clearBlueprintForm = () => {
    setEditingBlueprint(null);
    setBlueprintTitle("");
    setBlueprintTopic("");
    setBlueprintDifficulty("Medium");
    setBlueprintType("multiple-choice");
    setBlueprintObjective("");
    setBlueprintTemplateText("");
    setBlueprintOptionsTemplates(["", "", "", ""]);
    setBlueprintCorrectTemplate("0");
    setBlueprintVarType("explicit");
    setBlueprintVarSets(JSON.stringify({
      type: "explicit",
      sets: [
        { "A": 10, "B": 20 },
        { "A": 15, "B": 25 }
      ]
    }, null, 2));
    setBlueprintTags("algorithms, math");
    setBlueprintPreview(null);
    setBlueprintPreviewError("");
  };

  const handleSaveBlueprint = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let parsedVarSets;
      try {
        parsedVarSets = JSON.parse(blueprintVarSets || "{}");
      } catch (err) {
        alert("Invalid JSON in Variable Sets field.");
        return;
      }

      const payload = {
        title: blueprintTitle,
        topic: blueprintTopic,
        difficulty: blueprintDifficulty,
        questionType: blueprintType,
        learningObjective: blueprintObjective,
        templateText: blueprintTemplateText,
        optionsTemplates: blueprintOptionsTemplates,
        correctOptionTemplate: blueprintCorrectTemplate,
        variableSets: parsedVarSets,
        tags: blueprintTags.split(",").map(t => t.trim()).filter(Boolean)
      };

      const headers = await getAuthHeaders();
      let response;
      if (editingBlueprint) {
        response = await axios.put(`${API_BASE_URL}/api/blueprints/${editingBlueprint.id}`, payload, headers);
      } else {
        response = await axios.post(`${API_BASE_URL}/api/blueprints`, payload, headers);
      }

      if (response.data.success) {
        alert(editingBlueprint ? "Blueprint updated successfully!" : "Blueprint created successfully!");
        clearBlueprintForm();
        await fetchBlueprints();
        setBlueprintSubTab("library");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to save blueprint.");
    }
  };

  const handleDeleteBlueprint = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blueprint?")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await axios.delete(`${API_BASE_URL}/api/blueprints/${id}`, headers);
      if (response.data.success) {
        await fetchBlueprints();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete blueprint.");
    }
  };

  const handlePreviewVariant = async () => {
    setBlueprintPreviewLoading(true);
    setBlueprintPreviewError("");
    setBlueprintPreview(null);

    try {
      let parsedVarSets;
      try {
        parsedVarSets = JSON.parse(blueprintVarSets || "{}");
      } catch (err) {
        setBlueprintPreviewError("Invalid JSON in Variable Sets field.");
        setBlueprintPreviewLoading(false);
        return;
      }

      const payload = {
        template_text: blueprintTemplateText,
        options_templates: blueprintOptionsTemplates,
        correct_option_template: blueprintCorrectTemplate,
        variable_sets: parsedVarSets
      };

      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/blueprints/preview`, payload, headers);
      if (response.data.success) {
        setBlueprintPreview(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setBlueprintPreviewError(err.response?.data?.error || "Failed to generate variant preview.");
    } finally {
      setBlueprintPreviewLoading(false);
    }
  };

  const handleOpenExamBlueprints = async (exam) => {
    setSelectedExam(exam);
    setError("");
    setSelectedBlueprintIds([]);
    setActiveView("add-questions"); // Reuse add-questions view state
    try {
      await fetchBlueprints();
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/exams/${exam.id}`, headers);
      if (response.data.success) {
        const linkedBps = response.data.data.blueprints || [];
        setSelectedBlueprintIds(linkedBps.map(bp => bp.id));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve blueprints linked to this exam.");
    }
  };

  const handleSaveExamBlueprints = async () => {
    setError("");
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/exams/${selectedExam.id}/blueprints`,
        { blueprintIds: selectedBlueprintIds },
        headers
      );
      if (response.data.success) {
        alert("Blueprints successfully linked to the exam!");
        setSelectedExam(null);
        setSelectedBlueprintIds([]);
        await fetchExams();
        setActiveView("list");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to link blueprints to exam.");
    }
  };

  // Fetch all exams
  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/exams`, headers);
      if (response.data.success) {
        setExams(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve exams from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchBlueprints();
    fetchDocuments();
    fetchCandidates();
    fetchConcepts();
  }, []);

  // Handle Create Exam Submit
  const handleCreateExam = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/exams`,
        {
          title: examTitle,
          description: examDesc,
          passingPercentage,
          durationMinutes,
          negativeMarking,
          startTime: startTime || null,
          endTime: endTime || null
        },
        headers
      );

      if (response.data.success) {
        // Clear Form
        setExamTitle("");
        setExamDesc("");
        setPassingPercentage("50");
        setDurationMinutes("30");
        setNegativeMarking("0.00");
        setStartTime("");
        setEndTime("");
        
        // Refresh & redirect
        await fetchExams();
        setActiveView("list");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to create exam.");
    }
  };

  // Handle Add Staged Question locally
  const addQuestionStaged = () => {
    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      alert("Please fill in all question and option fields.");
      return;
    }

    const newQ = {
      questionText,
      options: [optionA, optionB, optionC, optionD],
      correctOption: parseInt(correctOption)
    };

    setTempQuestions((prev) => [...prev, newQ]);

    // Clear question form
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOption("0");
  };

  // Submit staged questions to backend
  const handleSaveQuestions = async () => {
    if (tempQuestions.length === 0) {
      alert("Please add at least one question to save.");
      return;
    }

    setError("");
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/exams/${selectedExam.id}/questions`,
        { questions: tempQuestions },
        headers
      );

      if (response.data.success) {
        setTempQuestions([]);
        setSelectedExam(null);
        await fetchExams();
        setActiveView("list");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to save questions to exam.");
    }
  };

  // Update Status Transition
  const handleUpdateStatus = async (examId, newStatus) => {
    setError("");
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/exams/${examId}/status`,
        { status: newStatus },
        headers
      );

      if (response.data.success) {
        await fetchExams();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to update exam status.");
    }
  };

  // View exam results/attempts
  const handleViewResults = async (exam) => {
    setSelectedExam(exam);
    setResultsLoading(true);
    setActiveView("results");
    setError("");
    
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/exams/${exam.id}/results`, headers);
      if (response.data.success) {
        setResults(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch exam results.");
    } finally {
      setResultsLoading(false);
    }
  };

  // RENDER DYNAMIC STATUS BADGE
  const renderStatusBadge = (status, effectiveStatus) => {
    if (status === "published" && effectiveStatus === "scheduled") {
      return (
        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-sky-950/40 border border-sky-800 text-sky-400 rounded-full">
          Scheduled
        </span>
      );
    }
    if (status === "published" && effectiveStatus === "closed") {
      return (
        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-950/40 border border-amber-800 text-amber-400 rounded-full">
          Auto Closed
        </span>
      );
    }

    switch (status) {
      case "draft":
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-yellow-950/40 border border-yellow-800 text-yellow-400 rounded-full">
            Draft
          </span>
        );
      case "published":
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-950/40 border border-emerald-800 text-emerald-400 rounded-full">
            Published
          </span>
        );
      case "closed":
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-rose-950/40 border border-rose-800 text-rose-400 rounded-full">
            Closed
          </span>
        );
      case "archived":
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-900 border border-slate-700 text-slate-400 rounded-full">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen radial-bg flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Award className="h-8 w-8 text-indigo-500 animate-pulse" />
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                Faculty Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-mono">VeriAcad Protocol Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-6 h-8">
            <button
              onClick={() => setActiveView("list")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                activeView === "list" ? "bg-slate-900 border border-slate-850 text-indigo-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Exams
            </button>
            <button
              onClick={() => {
                setActiveView("blueprints");
                fetchBlueprints();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                activeView === "blueprints" ? "bg-slate-900 border border-slate-850 text-indigo-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Blueprints
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs font-mono text-slate-400">
            Faculty: <span className="font-bold text-slate-200">{profileName}</span>
          </span>
          <button
            onClick={logout}
            className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition flex items-center gap-1.5 font-mono"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400" />
            Log Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-sm rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* VIEW 1: EXAMS LIST VIEW */}
        {activeView === "list" && (
          <>
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Managed Examinations
              </h2>
              <button
                onClick={() => setActiveView("create")}
                className="px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Create Exam
              </button>
            </div>

            {loading ? (
              <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm text-slate-400">Loading exams database...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center border-dashed border border-slate-850">
                <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-6">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-300">No Exams Found</h3>
                <p className="text-xs text-slate-505 mt-2 max-w-sm">
                  Create your first academic examination using the toolbar button to configure questions and start grading.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {exams.map((exam) => (
                  <div key={exam.id} className="glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6 hover-glow">
                    {/* Info */}
                    <div className="flex flex-col gap-2 max-w-xl">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-200">{exam.title}</h3>
                        {renderStatusBadge(exam.status, exam.effectiveStatus)}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{exam.description || "No description provided."}</p>
                      
                      {/* Configuration Parameter Details */}
                      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[10px] font-mono text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {exam.duration_minutes} Mins
                        </span>
                        <span>•</span>
                        <span>Passing: {exam.passing_percentage}%</span>
                        <span>•</span>
                        <span>Penalty: -{exam.negative_marking}</span>
                        
                        {(exam.start_time || exam.end_time) && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {exam.start_time ? new Date(exam.start_time).toLocaleString() : "Now"} - {exam.end_time ? new Date(exam.end_time).toLocaleString() : "Forever"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
                      {exam.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleOpenExamBlueprints(exam)}
                            className="px-3.5 py-2 font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition flex items-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5 text-indigo-400" />
                            Blueprints ({exam.questions_count})
                          </button>
                          
                          <button
                            onClick={() => {
                              if (exam.questions_count === 0) {
                                alert("Cannot publish an exam with 0 questions configured.");
                                return;
                              }
                              if (window.confirm("Publish this exam? This will make it visible to students immediately.")) {
                                handleUpdateStatus(exam.id, "published");
                              }
                            }}
                            className="px-3.5 py-2 font-bold bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/40 text-emerald-400 rounded-xl transition flex items-center gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Publish
                          </button>
                        </>
                      )}

                      {exam.status === "published" && (
                        <button
                          onClick={() => {
                            if (window.confirm("Close this exam? Submissions will be blocked immediately.")) {
                              handleUpdateStatus(exam.id, "closed");
                            }
                          }}
                          className="px-3.5 py-2 font-bold bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 text-rose-400 rounded-xl transition"
                        >
                          Close Exam
                        </button>
                      )}

                      {exam.status === "closed" && (
                        <button
                          onClick={() => {
                            if (window.confirm("Archive this exam? This hides it from students completely.")) {
                              handleUpdateStatus(exam.id, "archived");
                            }
                          }}
                          className="px-3.5 py-2 font-bold bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-450 rounded-xl transition"
                        >
                          Archive Exam
                        </button>
                      )}

                      <button
                        onClick={() => handleViewResults(exam)}
                        className="px-3.5 py-2 font-bold bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-900/40 text-indigo-400 rounded-xl transition flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Results
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* VIEW 2: CREATE EXAM FORM */}
        {activeView === "create" && (
          <div className="glass-panel rounded-2xl p-8 max-w-2xl w-full mx-auto border border-slate-900 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Configure New Examination
            </h2>
            
            <form onSubmit={handleCreateExam} className="flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Exam Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Contract Systems 101"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Description / Instructions</label>
                <textarea
                  placeholder="Instructions for students taking this exam..."
                  value={examDesc}
                  onChange={(e) => setExamDesc(e.target.value)}
                  rows="3"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm resize-none"
                />
              </div>

              {/* Grid configs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Duration (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none font-mono text-sm"
                  />
                </div>

                {/* Passing % */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Passing Grade (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none font-mono text-sm"
                  />
                </div>

                {/* Negative Marking */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Wrong Answer Penalty</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="5"
                    required
                    value={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              {/* Time bounds */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Start Schedule (UTC) - Optional</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">End Schedule (UTC) - Optional</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveView("list")}
                  className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-405 hover:text-slate-200 rounded-xl transition text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition text-sm font-semibold shadow-lg shadow-indigo-600/15"
                >
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 3: SELECT BLUEPRINTS FOR EXAM */}
        {activeView === "add-questions" && selectedExam && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: Blueprints List to Select From */}
            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-5 shadow-2xl">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Select Blueprints for: <span className="text-indigo-400">{selectedExam.title}</span>
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1">Select the reusable question templates to include in this exam.</p>
              </div>

              {blueprintsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
                  <p className="text-xs text-slate-500 font-mono">Loading blueprints library...</p>
                </div>
              ) : blueprints.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No reusable blueprints created yet. Navigate to the Blueprints tab in the header to configure blueprints first!
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {blueprints.map((bp) => {
                    const isSelected = selectedBlueprintIds.includes(bp.id);
                    return (
                      <div
                        key={bp.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBlueprintIds(prev => prev.filter(id => id !== bp.id));
                          } else {
                            setSelectedBlueprintIds(prev => [...prev, bp.id]);
                          }
                        }}
                        className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                          isSelected
                            ? "border-indigo-500/50 bg-indigo-950/10 hover:bg-indigo-950/20"
                            : "border-slate-850 bg-slate-950/40 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-200">{bp.title}</h4>
                            <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full ${
                              bp.difficulty === "Easy" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/30" :
                              bp.difficulty === "Hard" ? "bg-rose-950/50 text-rose-400 border border-rose-800/30" :
                              "bg-amber-950/50 text-amber-450 border border-amber-800/30"
                            }`}>
                              {bp.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{bp.template_text}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {bp.topic && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">{bp.topic}</span>}
                            {(bp.tags || []).map((tag, idx) => (
                              <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/50 border border-slate-850 text-slate-600">#{tag}</span>
                            ))}
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                          isSelected ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-700 bg-slate-900 text-transparent"
                        }`}>
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right side: Selected list summary & Actions */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-4 shadow-2xl">
                <h3 className="text-sm font-bold text-slate-200 font-mono">Selection Summary</h3>
                <div className="flex flex-col gap-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Blueprints Selected:</span>
                    <span className="font-bold text-indigo-400">{selectedBlueprintIds.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      setSelectedExam(null);
                      setSelectedBlueprintIds([]);
                      setActiveView("list");
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExamBlueprints}
                    disabled={selectedBlueprintIds.length === 0}
                    className="flex-1 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition shadow-lg shadow-indigo-600/10"
                  >
                    Save Selection
                  </button>
                </div>
              </div>

              {/* Display preview of selected blueprints */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono text-slate-500">Selected Blueprint Order:</span>
                {selectedBlueprintIds.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-600 font-mono border border-dashed border-slate-850 rounded-xl">
                    No blueprints in queue.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                    {selectedBlueprintIds.map((id, index) => {
                      const bp = blueprints.find(b => b.id === id);
                      if (!bp) return null;
                      return (
                        <div key={id} className="p-3 rounded-lg border border-slate-900 bg-slate-950/40 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-bold truncate max-w-[200px]">{index + 1}. {bp.title}</span>
                          <button
                            onClick={() => setSelectedBlueprintIds(prev => prev.filter(bId => bId !== id))}
                            className="text-slate-500 hover:text-rose-455 transition"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: EXAM RESULTS VIEWER */}
        {activeView === "results" && selectedExam && (
          <div className="glass-panel rounded-2xl p-6 border border-slate-900 shadow-2xl flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100">Results: {selectedExam.title}</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Duration: {selectedExam.duration_minutes} Mins | Passing: {selectedExam.passing_percentage}%
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedExam(null);
                  setResults([]);
                  setActiveView("list");
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl transition"
              >
                Back to Exams
              </button>
            </div>

            {/* Results Table */}
            {resultsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-xs text-slate-500 font-mono">Fetching student audit history...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                No attempt records registered for this exam yet.
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-xl border border-slate-900 bg-slate-950/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 text-slate-500 font-mono uppercase text-[9px] tracking-wider">
                      <th className="p-4 font-bold">Student Name</th>
                      <th className="p-4 font-bold">Email</th>
                      <th className="p-4 font-bold text-center">Attempt</th>
                      <th className="p-4 font-bold text-center">Score</th>
                      <th className="p-4 font-bold text-center">Grade (%)</th>
                      <th className="p-4 font-bold text-center">Outcome</th>
                      <th className="p-4 font-bold">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {results.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/30 transition">
                        <td className="p-4 font-bold text-slate-200">{row.student_name}</td>
                        <td className="p-4 font-mono text-slate-400">{row.student_email}</td>
                        <td className="p-4 text-center font-mono font-bold">{row.attempt_number}</td>
                        <td className="p-4 text-center font-mono">
                          {row.score} / {row.total_questions}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{row.percentage}%</td>
                        <td className="p-4 text-center">
                          {row.passed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 font-mono">
                              Passed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-455 font-mono">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-slate-500">
                          {new Date(row.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: BLUEPRINTS MANAGEMENT VIEW */}
        {activeView === "blueprints" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Question Blueprint Management
              </h2>
              {blueprintSubTab !== "manual" && (
                <button
                  onClick={() => {
                    clearBlueprintForm();
                    setBlueprintSubTab("manual");
                  }}
                  className="px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Create Blueprint
                </button>
              )}
            </div>

            {/* Sub-Tabs Bar */}
            <div className="flex border-b border-slate-900 mb-2 overflow-x-auto">
              <button
                onClick={() => setBlueprintSubTab("library")}
                className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition ${
                  blueprintSubTab === "library"
                    ? "border-indigo-500 text-indigo-400 bg-slate-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Blueprint Library
              </button>
              <button
                onClick={() => {
                  setBlueprintSubTab("upload");
                  fetchDocuments();
                }}
                className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition ${
                  blueprintSubTab === "upload"
                    ? "border-indigo-500 text-indigo-400 bg-slate-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Upload Documents
              </button>
              <button
                onClick={() => {
                  setBlueprintSubTab("reports");
                  fetchDocuments();
                }}
                className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition ${
                  blueprintSubTab === "reports"
                    ? "border-indigo-500 text-indigo-400 bg-slate-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Processing Reports
              </button>
              <button
                onClick={() => {
                  setBlueprintSubTab("review-topics");
                  fetchTopics();
                }}
                className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition ${
                  blueprintSubTab === "review-topics"
                    ? "border-indigo-500 text-indigo-400 bg-slate-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Review Topics ({topics.length})
              </button>
              <button
                onClick={() => {
                  setBlueprintSubTab("review-concepts");
                  fetchConcepts();
                }}
                className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition ${
                  blueprintSubTab === "review-concepts"
                    ? "border-indigo-500 text-indigo-400 bg-slate-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Review Concepts ({concepts.filter(c => c.status === "PENDING_REVIEW").length})
              </button>
              <button
                onClick={() => {
                  setBlueprintSubTab("review-blueprints");
                  fetchCandidates();
                }}
                className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition ${
                  blueprintSubTab === "review-blueprints"
                    ? "border-indigo-500 text-indigo-400 bg-slate-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Review AI Blueprints ({candidates.filter(c => c.status === "PENDING_REVIEW").length})
              </button>
              <button
                onClick={() => {
                  if (!editingBlueprint) {
                    clearBlueprintForm();
                  }
                  setBlueprintSubTab("manual");
                }}
                className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition ${
                  blueprintSubTab === "manual"
                    ? "border-indigo-500 text-indigo-400 bg-slate-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {editingBlueprint ? "Edit Blueprint" : "Manual Creation (Advanced)"}
              </button>
            </div>

            {/* Sub-Tab 1: Library */}
            {blueprintSubTab === "library" && (
              blueprintsLoading ? (
                <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                  <p className="text-sm text-slate-400">Loading blueprints database...</p>
                </div>
              ) : blueprints.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center border-dashed border border-slate-850">
                  <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-6">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-300">No Blueprints Found</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">
                    Create reusable blueprints that define template formulas. These templates are resolved dynamically to generate custom questions for students.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blueprints.map((bp) => (
                    <div key={bp.id} className="glass-panel rounded-2xl p-5 border border-slate-900 flex flex-col justify-between gap-4 hover-glow">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-200 line-clamp-1">{bp.title}</h3>
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full flex-shrink-0 ${
                            bp.difficulty === "Easy" ? "bg-emerald-950/50 text-emerald-450 border border-emerald-800/30" :
                            bp.difficulty === "Hard" ? "bg-rose-950/50 text-rose-455 border border-rose-800/30" :
                            "bg-amber-950/50 text-amber-455 border border-amber-800/30"
                          }`}>
                            {bp.difficulty}
                          </span>
                        </div>
                        {bp.topic && (
                          <span className="text-[10px] font-mono text-slate-500">Topic: {bp.topic}</span>
                        )}
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 italic font-mono bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                          {bp.template_text}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(bp.tags || []).map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 border-t border-slate-900 pt-3 mt-1 font-mono text-[10px]">
                        <button
                          onClick={() => {
                            setEditingBlueprint(bp);
                            setBlueprintTitle(bp.title);
                            setBlueprintTopic(bp.topic || "");
                            setBlueprintDifficulty(bp.difficulty || "Medium");
                            setBlueprintType(bp.question_type || "multiple-choice");
                            setBlueprintObjective(bp.learning_objective || "");
                            setBlueprintTemplateText(bp.template_text);
                            setBlueprintOptionsTemplates(bp.options_templates || ["", "", "", ""]);
                            setBlueprintCorrectTemplate(bp.correct_option_template);
                            setBlueprintVarSets(JSON.stringify(bp.variable_sets, null, 2));
                            setBlueprintTags((bp.tags || []).join(", "));
                            setBlueprintPreview(null);
                            setBlueprintPreviewError("");
                            setBlueprintSubTab("manual");
                          }}
                          className="px-2.5 py-1.5 font-bold bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBlueprint(bp.id)}
                          className="px-2.5 py-1.5 font-bold bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-455 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Sub-Tab 2: Upload */}
            {blueprintSubTab === "upload" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-6 glass-panel rounded-2xl p-6 border border-slate-900 shadow-2xl">
                  <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <Upload className="h-5 w-5 text-indigo-400" />
                    Upload Question Bank Document
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Select a **PDF** or **TXT** question bank. The system will extract the questions and automatically parameterize them into reusable blueprint candidates.
                  </p>

                  <form onSubmit={handleFileUpload} className="flex flex-col gap-4">
                    <div className="border border-slate-800 bg-slate-950/50 rounded-xl p-8 text-center flex flex-col items-center justify-center border-dashed cursor-pointer hover:border-indigo-500/50 transition relative">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        required
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <Upload className="h-10 w-10 text-slate-500 mb-3" />
                      <span className="text-sm font-semibold text-slate-300">
                        {uploadFile ? uploadFile.name : "Choose PDF or TXT file"}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">PDF & TXT files only</span>
                    </div>

                    {uploadStatus && (
                      <div className="p-3 bg-indigo-950/15 border border-indigo-900/25 rounded-lg flex items-center gap-2.5 text-xs text-indigo-400 font-mono">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        {uploadStatus}
                      </div>
                    )}

                    <div className="flex justify-end gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadStatus("");
                        }}
                        disabled={uploading}
                        className="px-4 py-2 bg-slate-900 border border-slate-800 text-xs font-bold font-mono text-slate-400 hover:text-slate-200 rounded-xl transition"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={uploading || !uploadFile}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold font-mono text-white rounded-xl transition flex items-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Upload & Process"
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Upload Instructions and Info */}
                <div className="lg:col-span-6 glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-4">
                  <h4 className="text-sm font-bold text-slate-300 font-mono">AI Parameterization Guidelines</h4>
                  <ul className="text-xs text-slate-400 flex flex-col gap-2.5 list-disc pl-4 font-mono leading-relaxed">
                    <li>The system extracts standard question text, multiple choice option strings, and the answer keys.</li>
                    <li>Questions containing arithmetic operations (e.g. `5 + 10`) are parameterized automatically using generators.</li>
                    <li>DSA search/sorting questions (e.g. Merge Sort complexity) are parameterized with explicit variant sets.</li>
                    <li>Other questions are extracted as structured templates with static text as a general knowledge fallback.</li>
                    <li>You must review each candidate, preview its randomized seeds, and approve it before it becomes active in the library.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Reports */}
            {blueprintSubTab === "reports" && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-200 font-mono mb-2">AI Question Bank Processing Reports</h3>
                {documents.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-505 font-mono border-dashed border border-slate-850">
                    No documents uploaded yet. Go to the Upload tab to process your first question bank!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.slice(0, 4).map((doc) => {
                      const report = doc.report_json;
                      return (
                        <div key={doc.id} className="glass-panel rounded-2xl p-5 border border-slate-900 flex flex-col gap-3 hover-glow">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                            <span className="font-bold text-slate-200 truncate max-w-[250px]">{doc.file_name}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full ${
                              doc.processing_status === "COMPLETED" ? "bg-emerald-950/40 text-emerald-455 border border-emerald-800/40" :
                              doc.processing_status === "FAILED" ? "bg-rose-955/40 text-rose-455 border border-rose-900/40" :
                              "bg-yellow-955/40 text-yellow-455 border border-yellow-900/40 animate-pulse"
                            }`}>
                              {doc.processing_status}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-1 text-[11px] font-mono text-slate-400">
                            <div className="flex justify-between">
                              <span>Uploaded At:</span>
                              <span className="text-slate-500">{new Date(doc.uploaded_at).toLocaleString()}</span>
                            </div>
                            {report ? (
                              <>
                                <div className="flex justify-between border-t border-slate-950 pt-1 mt-1">
                                  <span>Total Extracted:</span>
                                  <span className="font-bold text-indigo-400">
                                    {report.totalConcepts !== undefined ? `${report.totalConcepts} Concepts` : `${report.totalQuestions} Questions`}
                                  </span>
                                </div>
                                {report.totalTopics !== undefined ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Unique Topics:</span>
                                      <span className="text-slate-300">{report.totalTopics}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Unique Subtopics:</span>
                                      <span className="text-slate-300">{report.totalSubtopics}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Multiple Choice (MCQs):</span>
                                      <span className="text-slate-300">{report.mcqCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Coding Challenges:</span>
                                      <span className="text-slate-300">{report.codingCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Short Answers:</span>
                                      <span className="text-slate-300">{report.shortAnswerCount}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-950 pt-1.5 mt-1.5 items-center">
                                      <span>Avg Confidence Score:</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        report.averageConfidence >= 80 ? "bg-emerald-950/40 text-emerald-450" :
                                        report.averageConfidence >= 55 ? "bg-amber-950/40 text-amber-450" :
                                        "bg-rose-950/40 text-rose-455 font-mono"
                                      }`}>
                                        {report.averageConfidence}%
                                      </span>
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="py-4 text-center text-slate-500 italic">
                                {doc.processing_status === "FAILED" ? "Error during extraction. Check log details." : "No metrics compiled yet."}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 3b: Review Topics */}
            {blueprintSubTab === "review-topics" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-slate-950/40 p-4 border border-slate-900 rounded-2xl gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-200 font-mono">Extracted Topics</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-indigo-950 text-indigo-400 border border-indigo-850 rounded-full">
                      {topics.length} Total
                    </span>
                  </div>
                  <button
                    onClick={fetchTopics}
                    className="px-3 py-2 text-xs bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-xl transition font-mono"
                  >
                    Refresh Topics
                  </button>
                </div>

                {topicsLoading ? (
                  <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-sm text-slate-400">Loading extracted topics...</p>
                  </div>
                ) : topics.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <BookOpen className="h-12 w-12 text-slate-700 mb-4" />
                    <p className="text-sm text-slate-400 font-mono">No topics extracted yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Upload and process a document to extract topics.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topics.map((topic) => {
                      const confidence = topic.confidence_score ? parseFloat(topic.confidence_score) : 0;
                      const confidencePercent = Math.round(confidence * 100);
                      return (
                        <div
                          key={topic.id}
                          className="glass-panel rounded-2xl p-5 border border-slate-900 hover:border-indigo-900/50 transition-all duration-300 flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-200 truncate">{topic.topic_name}</h4>
                              {topic.source_file_name && (
                                <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                                  From: {topic.source_file_name}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteTopic(topic.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition ml-2 flex-shrink-0"
                              title="Delete topic and its concepts"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {topic.description && (
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{topic.description}</p>
                          )}

                          <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-mono">Concepts:</span>
                              <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 rounded">
                                {topic.concept_count || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-mono">Confidence:</span>
                              <span className={`px-1.5 py-0.5 text-[10px] font-bold font-mono rounded ${
                                confidencePercent >= 80 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" :
                                confidencePercent >= 60 ? "bg-amber-950/40 text-amber-400 border border-amber-900/30" :
                                "bg-rose-950/40 text-rose-400 border border-rose-900/30"
                              }`}>
                                {confidencePercent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 4a: Review Concepts */}
            {blueprintSubTab === "review-concepts" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-slate-950/40 p-4 border border-slate-900 rounded-2xl gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-200 font-mono">Extracted Knowledge Units & Concepts</h3>
                    {selectedConceptIds.length > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-indigo-950 text-indigo-400 border border-indigo-850 rounded-full animate-pulse">
                        {selectedConceptIds.length} Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConceptIds.length > 0 && (
                      <button
                        onClick={handleGenerateBlueprintsBulk}
                        disabled={bulkGenerating}
                        className="px-4 py-2 text-xs font-bold font-mono bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-650/10"
                      >
                        {bulkGenerating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Bulk Generating...
                          </>
                        ) : (
                          "Bulk Generate Blueprints"
                        )}
                      </button>
                    )}
                    {concepts.filter(c => c.status === "PENDING_REVIEW").length > 0 && (
                      <button
                        onClick={handleRejectAllConcepts}
                        className="px-3 py-2 text-xs bg-rose-955/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-455 rounded-xl transition font-mono"
                      >
                        Reject All Concepts
                      </button>
                    )}
                    <button
                      onClick={fetchConcepts}
                      className="px-3 py-2 text-xs bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-xl transition font-mono"
                    >
                      Refresh Concepts
                    </button>
                  </div>
                </div>

                {conceptsLoading ? (
                  <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-sm text-slate-400 font-mono">Loading concepts for review...</p>
                  </div>
                ) : concepts.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-500 border-dashed border border-slate-850 font-mono">
                    No concepts extracted yet. Upload notes or syllabus documents to extract concepts first!
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {concepts.filter(c => c.status !== "REJECTED").map((c) => (
                      <div key={c.id} className="glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-4 hover-glow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                          <div className="flex items-start gap-3">
                            {c.status === "APPROVED" && (
                              <input
                                type="checkbox"
                                checked={selectedConceptIds.includes(c.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedConceptIds(prev => [...prev, c.id]);
                                  } else {
                                    setSelectedConceptIds(prev => prev.filter(id => id !== c.id));
                                  }
                                }}
                                className="mt-1 h-4 w-4 rounded border-slate-850 bg-slate-900 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                              />
                            )}
                            <div>
                              <h3 className="text-sm font-bold text-indigo-400 font-mono">
                                Concept: {c.normalized_concept || c.concept}
                              </h3>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                From Document: <span className="text-slate-400">{c.file_name || "Unknown Document"}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                              c.status === "APPROVED" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/30" :
                              c.status === "REJECTED" ? "bg-rose-955/50 text-rose-455 border border-rose-800/30" :
                              "bg-amber-955/50 text-amber-455 border border-amber-800/30 animate-pulse"
                            }`}>
                              Status: {c.status}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                              c.difficulty === "Easy" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/30" :
                              c.difficulty === "Hard" ? "bg-rose-955/50 text-rose-455 border border-rose-800/30" :
                              "bg-amber-955/50 text-amber-455 border border-amber-800/30"
                            }`}>
                              Diff: {c.difficulty}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-950/50 text-indigo-400 border border-indigo-800/30 rounded-full">
                              Conf: {c.confidence_score !== undefined ? (c.confidence_score * 100).toFixed(0) : "100"}%
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex flex-col gap-2">
                            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Concept Context</span>
                            <div className="text-xs text-slate-400 flex flex-col gap-1.5 font-sans">
                              <div><strong className="text-slate-500 font-mono">Topic:</strong> {c.topic}</div>
                              <div><strong className="text-slate-500 font-mono">Raw Concept:</strong> <span className="italic text-slate-400">{c.raw_concept || c.concept}</span></div>
                              <div><strong className="text-slate-500 font-mono">Normalized Concept:</strong> <span className="text-indigo-400 font-semibold">{c.normalized_concept || c.concept}</span></div>
                              <div className="mt-1"><strong className="text-slate-500 font-mono">Learning Objective:</strong> {c.learning_objective}</div>
                            </div>
                          </div>

                          <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl flex flex-col gap-3">
                            <div>
                              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Extraction Justification</span>
                              <p className="text-xs text-slate-300 leading-relaxed italic font-mono mt-1">
                                {c.extraction_reason || "No reason specified."}
                              </p>
                            </div>
                            {c.source_snippet && (
                              <div className="border-t border-slate-900/60 pt-2">
                                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Source Snippet</span>
                                <p className="text-xs text-slate-400 leading-relaxed font-mono mt-1 bg-slate-950/80 p-2 border border-slate-900 rounded-lg max-h-20 overflow-y-auto">
                                  "{c.source_snippet}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900 pt-3 mt-1 font-mono text-xs">
                          <div>
                            {c.status === "APPROVED" && (
                              <button
                                onClick={() => handleGenerateBlueprints(c.id)}
                                disabled={generatingBlueprintsId !== null}
                                className="px-4 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 text-white rounded-xl transition shadow-lg shadow-indigo-600/10 flex items-center gap-1.5"
                              >
                                {generatingBlueprintsId === c.id ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Generating Blueprints...
                                  </>
                                ) : (
                                  "Generate Blueprints (Stage 2)"
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingConcept(c);
                                setConceptTopic(c.topic);
                                setConceptName(c.normalized_concept || c.concept);
                                setConceptRaw(c.raw_concept || c.concept || "");
                                setConceptSnippet(c.source_snippet || "");
                                setConceptObjective(c.learning_objective || "");
                                setConceptDifficulty(c.difficulty || "Medium");
                                setConceptConfidence(c.confidence_score || 1.0);
                                setConceptReason(c.extraction_reason || "");
                              }}
                              className="px-3.5 py-1.5 font-bold bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 rounded-xl transition"
                            >
                              Edit Concept
                            </button>
                            {c.status !== "REJECTED" && (
                              <button
                                onClick={() => handleRejectConcept(c.id)}
                                className="px-3.5 py-1.5 font-bold bg-rose-955/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-455 rounded-xl transition"
                              >
                                Reject
                              </button>
                            )}
                            {c.status !== "APPROVED" && (
                              <button
                                onClick={() => handleApproveConcept(c.id)}
                                className="px-4 py-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-lg shadow-emerald-600/10"
                              >
                                Approve Concept
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 4b: Review AI Blueprints */}
            {blueprintSubTab === "review-blueprints" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 font-mono">Pending AI Blueprint Candidates</h3>
                  <div className="flex items-center gap-2">
                    {candidates.filter(c => c.status === "PENDING_REVIEW").length > 0 && (
                      <button
                        onClick={handleRejectAllCandidates}
                        className="px-3 py-1.5 text-xs font-bold bg-rose-955/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-455 rounded-xl transition font-mono"
                      >
                        Reject All Candidates
                      </button>
                    )}
                    <button
                      onClick={fetchCandidates}
                      className="px-2.5 py-1.5 text-[10px] bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-lg transition font-mono"
                    >
                      Refresh List
                    </button>
                  </div>
                </div>

                {candidatesLoading ? (
                  <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-sm text-slate-400 font-mono">Loading candidates for review...</p>
                  </div>
                ) : candidates.filter(c => c.status === "PENDING_REVIEW").length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-500 border-dashed border border-slate-850 font-mono">
                    All blueprint candidates reviewed! Generate new blueprint candidates from approved concepts or upload another question bank.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {candidates.filter(c => c.status === "PENDING_REVIEW").map((cand) => (
                      <div key={cand.id} className="glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-4 hover-glow">
                        {/* Candidate Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                          <div>
                            <h3 className="text-sm font-bold text-indigo-400 font-mono">
                              {cand.generated_json.title || "AI Candidate Blueprint"}
                            </h3>
                            {cand.concept_name && (
                              <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                Concept: <span className="text-slate-300 font-bold">{cand.concept_name}</span> ({cand.concept_topic})
                              </p>
                            )}
                            <p className="text-[10px] text-slate-505 font-mono mt-0.5">
                              From Document: <span className="text-slate-400">{cand.file_name}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                              cand.quality_score >= 80 ? "bg-emerald-950/50 text-emerald-450 border border-emerald-800/30" :
                              cand.quality_score >= 50 ? "bg-amber-955/50 text-amber-455 border border-amber-800/30" :
                              "bg-rose-955/50 text-rose-455 border border-rose-800/30"
                            }`}>
                              Quality: {cand.quality_score}%
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-950/50 text-indigo-400 border border-indigo-800/30 rounded-full">
                              Conf: {(cand.confidence_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Side-by-Side original vs template */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left: Original Question / Context */}
                          <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex flex-col gap-2">
                            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Candidate Source / Context</span>
                            <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                              {cand.original_question}
                            </pre>
                          </div>

                          {/* Right: Generated Blueprint */}
                          <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl flex flex-col gap-2">
                            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Generated Blueprint Template</span>
                            <div className="text-xs text-slate-300 flex flex-col gap-2">
                              <div>
                                <span className="text-slate-505 font-mono">Template: </span>
                                <span className="font-mono bg-slate-950 p-2 rounded border border-slate-900 block mt-1 whitespace-pre-wrap">
                                  {cand.generated_json.template_text}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-550 font-mono">Options Templates: </span>
                                {cand.generated_json.options_templates && cand.generated_json.options_templates.length > 0 ? (
                                  <ul className="list-disc pl-4 mt-1 font-mono text-slate-400">
                                    {cand.generated_json.options_templates?.map((opt, idx) => (
                                      <li key={idx} className={cand.generated_json.correct_option_template === String(idx) ? "text-emerald-400 font-bold" : ""}>
                                        {["A", "B", "C", "D"][idx]}: {opt}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-slate-400 italic font-mono block mt-1">None (Short Answer / Scenario-Based)</span>
                                )}
                              </div>
                              <div className="mt-2">
                                <span className="text-slate-500 font-mono">Expected Answer Template: </span>
                                <span className="font-mono bg-slate-950 p-2 rounded border border-slate-900 block mt-1 whitespace-pre-wrap text-emerald-400">
                                  {cand.generated_json.correct_option_template}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
                                <span>Difficulty: <strong className="text-slate-400">{cand.generated_json.difficulty}</strong></span>
                                <span>Type: <strong className="text-indigo-400 uppercase">{cand.generated_json.question_type || cand.generated_json.questionType || "MCQ"}</strong></span>
                                <span>Topic: <strong className="text-slate-400">{cand.generated_json.topic || "General"}</strong></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Variant Preview deck, shown inline when loaded */}
                        {candPreviews[cand.id] && (
                          <div className="border border-slate-850 bg-slate-955/80 rounded-xl p-4 mt-2 flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                              <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                                <Eye className="h-3.5 w-3.5" />
                                Generated Blueprint Variants Preview (3 seeds)
                              </span>
                              <button
                                onClick={() => setCandPreviews(prev => {
                                  const updated = { ...prev };
                                  delete updated[cand.id];
                                  return updated;
                                })}
                                className="text-slate-550 hover:text-slate-300 text-xs font-mono"
                              >
                                [Hide]
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {candPreviews[cand.id].map((variant, vIdx) => (
                                <div key={vIdx} className="bg-slate-950 border border-slate-900 p-3.5 rounded-lg flex flex-col gap-3 font-mono text-[11px] relative">
                                  <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] bg-slate-900 border border-slate-800 text-slate-500 rounded">
                                    Seed: {variant.seed}
                                  </span>
                                  <div className="flex flex-col gap-1.5">
                                    <span className="text-[9px] text-indigo-400 font-bold">Variant {vIdx + 1}:</span>
                                    <p className="text-slate-300 font-semibold leading-relaxed">{variant.questionText}</p>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-indigo-400 font-bold">Options:</span>
                                    {variant.options && variant.options.length > 0 ? (
                                      variant.options.map((opt, oIdx) => {
                                        const isCorrect = variant.correctOption === oIdx;
                                        return (
                                          <div key={oIdx} className={`p-1.5 rounded border text-[10px] ${
                                            isCorrect ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 font-bold" : "bg-slate-955 border-slate-900 text-slate-500"
                                          }`}>
                                            {["A", "B", "C", "D"][oIdx]}: {opt}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-slate-500 italic">None (Short Answer / Scenario)</span>
                                    )}
                                  </div>
                                  <div className="text-[8px] text-slate-600 border-t border-slate-900 pt-2 mt-auto">
                                    Vars: {JSON.stringify(variant.selectedVariables)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900 pt-3 mt-1 font-mono text-xs">
                          <button
                            onClick={() => handlePreviewCandidate(cand.id)}
                            disabled={candPreviewLoading[cand.id]}
                            className="px-3 py-1.5 font-bold bg-slate-900 hover:bg-slate-850 border border-slate-850 text-indigo-400 rounded-xl transition flex items-center gap-1.5"
                          >
                            {candPreviewLoading[cand.id] ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            Preview Variants
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingCandidate(cand);
                                setCandTitle(cand.generated_json.title || "");
                                setCandTopic(cand.generated_json.topic || "");
                                setCandDifficulty(cand.generated_json.difficulty || "Medium");
                                setCandType(cand.generated_json.question_type || cand.generated_json.questionType || "multiple-choice");
                                setCandObjective(cand.generated_json.learning_objective || cand.generated_json.learningObjective || "");
                                setCandTemplateText(cand.generated_json.template_text || cand.generated_json.templateText || "");
                                setCandOptionsTemplates(cand.generated_json.options_templates || cand.generated_json.optionsTemplates || ["", "", "", ""]);
                                setCandCorrectTemplate(cand.generated_json.correct_option_template || cand.generated_json.correctOptionTemplate || "0");
                                setCandVarSets(JSON.stringify(cand.generated_json.variable_sets || cand.generated_json.variableSets || {}, null, 2));
                                setCandTags((cand.generated_json.tags || []).join(", "));
                              }}
                              className="px-3.5 py-1.5 font-bold bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 rounded-xl transition"
                            >
                              Edit Candidate
                            </button>
                            <button
                              onClick={() => handleRejectCandidate(cand.id)}
                              className="px-3.5 py-1.5 font-bold bg-rose-955/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-455 rounded-xl transition"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveCandidate(cand.id)}
                              className="px-4 py-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-lg shadow-emerald-600/10"
                            >
                              Approve & Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 5: Manual */}
            {blueprintSubTab === "manual" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form */}
                <form onSubmit={handleSaveBlueprint} className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-4 shadow-2xl">
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-indigo-400" />
                    {editingBlueprint ? "Update Blueprint Details" : "Create Reusable Question Blueprint"}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Title</label>
                      <input
                        type="text"
                        required
                        value={blueprintTitle}
                        onChange={(e) => setBlueprintTitle(e.target.value)}
                        placeholder="e.g., Quadratic Formula Root Solver"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Topic</label>
                      <input
                        type="text"
                        value={blueprintTopic}
                        onChange={(e) => setBlueprintTopic(e.target.value)}
                        placeholder="e.g., Mathematics, Smart Contracts"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Difficulty</label>
                      <select
                        value={blueprintDifficulty}
                        onChange={(e) => setBlueprintDifficulty(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Question Type</label>
                      <input
                        type="text"
                        value={blueprintType}
                        onChange={(e) => setBlueprintType(e.target.value)}
                        placeholder="e.g. multiple-choice"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={blueprintTags}
                        onChange={(e) => setBlueprintTags(e.target.value)}
                        placeholder="e.g. math, algebra, quadratic"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Learning Objective</label>
                    <textarea
                      value={blueprintObjective}
                      onChange={(e) => setBlueprintObjective(e.target.value)}
                      placeholder="What objective is assessed by this blueprint..."
                      rows="1"
                      className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none resize-none font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                      Question Template Text (Placeholders: `{"{{A}}"}`)
                    </label>
                    <textarea
                      required
                      value={blueprintTemplateText}
                      onChange={(e) => setBlueprintTemplateText(e.target.value)}
                      placeholder="e.g., What is the sum of {{A}} and {{B}}?"
                      rows="2"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none resize-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {blueprintOptionsTemplates.map((opt, idx) => (
                      <div key={idx}>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-0.5">
                          Option {["A", "B", "C", "D"][idx]} Template
                        </label>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...blueprintOptionsTemplates];
                            newOpts[idx] = e.target.value;
                            setBlueprintOptionsTemplates(newOpts);
                          }}
                          placeholder={`e.g. {{A + B}}`}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-slate-200 text-sm focus:outline-none font-mono"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                        Correct Option Template (Index 0-3 or Expression)
                      </label>
                      <input
                        type="text"
                        required
                        value={blueprintCorrectTemplate}
                        onChange={(e) => setBlueprintCorrectTemplate(e.target.value)}
                        placeholder="e.g., 0"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Variable Set Type</label>
                      <select
                        value={blueprintVarType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBlueprintVarType(val);
                          if (val === "explicit") {
                            setBlueprintVarSets(JSON.stringify({
                              type: "explicit",
                              sets: [
                                { "A": 10, "B": 20 },
                                { "A": 15, "B": 25 }
                              ]
                            }, null, 2));
                          } else {
                            setBlueprintVarSets(JSON.stringify({
                              type: "generator",
                              variables: {
                                "A": { "min": 1, "max": 100 },
                                "B": { "choices": [10, 20, 30, 40] }
                              }
                            }, null, 2));
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                      >
                        <option value="explicit">Explicit Set Lists</option>
                        <option value="generator">Dynamic Generators (Ranges)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Variable Configuration (JSON)</label>
                    <textarea
                      required
                      value={blueprintVarSets}
                      onChange={(e) => setBlueprintVarSets(e.target.value)}
                      rows="5"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none font-mono resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        clearBlueprintForm();
                        setBlueprintSubTab("library");
                      }}
                      className="px-4 py-2 bg-slate-900 border border-slate-855 hover:bg-slate-800 text-slate-400 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-lg shadow-indigo-600/15"
                    >
                      {editingBlueprint ? "Update" : "Save Blueprint"}
                    </button>
                  </div>
                </form>

                {/* Live Preview Panel */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-200 font-mono">Seeded Variant Preview</h3>
                      <button
                        type="button"
                        onClick={handlePreviewVariant}
                        disabled={blueprintPreviewLoading}
                        className="px-3 py-1.5 text-[10px] font-bold font-mono bg-slate-900 border border-slate-855 text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                      >
                        {blueprintPreviewLoading ? "Generating..." : "Generate Preview"}
                      </button>
                    </div>

                    {blueprintPreviewError && (
                      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-455 text-xs font-mono">
                        {blueprintPreviewError}
                      </div>
                    )}

                    {blueprintPreview ? (
                      <div className="flex flex-col gap-3 font-mono text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Generated Seed:</span>
                          <span className="font-bold">{blueprintPreview.variant_seed}</span>
                        </div>

                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-900 flex flex-col gap-2">
                          <span className="text-[10px] text-indigo-400 font-bold">Question:</span>
                          <p className="text-slate-200 font-semibold">{blueprintPreview.questionText}</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-indigo-400 font-bold">Options:</span>
                          {blueprintPreview.options.map((opt, idx) => {
                            const isCorrect = blueprintPreview.correctOption === idx;
                            return (
                              <div key={idx} className={`p-2 rounded-lg border flex items-center justify-between ${
                                isCorrect ? "bg-emerald-950/10 border-emerald-500/30 text-emerald-400 font-bold" : "bg-slate-955/20 border-slate-900 text-slate-400"
                              }`}>
                                <span>{["A", "B", "C", "D"][idx]}: {opt}</span>
                                {isCorrect && <span>✔</span>}
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-900 flex flex-col gap-1.5">
                          <span className="text-[10px] text-slate-500 font-bold">Generated Variables Map:</span>
                          <pre className="text-[10px] text-slate-400">{JSON.stringify(blueprintPreview.selectedVariables, null, 2)}</pre>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-600 font-mono border border-dashed border-slate-850 rounded-xl">
                        Click "Generate Preview" to test current blueprint settings on the server.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Candidate Edit Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl border border-slate-800 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Edit Candidate Blueprint
              </h3>
              <button
                onClick={() => setEditingCandidate(null)}
                className="text-slate-500 hover:text-slate-300 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  let parsedVarSets;
                  try {
                    parsedVarSets = JSON.parse(candVarSets || "{}");
                  } catch (err) {
                    alert("Invalid JSON in Variable Sets field.");
                    return;
                  }

                  const payload = {
                    title: candTitle,
                    topic: candTopic,
                    difficulty: candDifficulty,
                    question_type: candType,
                    learning_objective: candObjective,
                    template_text: candTemplateText,
                    options_templates: candOptionsTemplates,
                    correct_option_template: candCorrectTemplate,
                    variable_sets: parsedVarSets,
                    tags: candTags.split(",").map(t => t.trim()).filter(Boolean)
                  };

                  const headers = await getAuthHeaders();
                  const response = await axios.put(`${API_BASE_URL}/api/blueprint-candidates/${editingCandidate.id}`, {
                    generatedJson: payload
                  }, headers);

                  if (response.data.success) {
                    alert("Candidate blueprint updated successfully!");
                    setEditingCandidate(null);
                    await fetchCandidates();
                  }
                } catch (err) {
                  console.error(err);
                  alert(err.response?.data?.error || "Failed to update candidate blueprint.");
                }
              }}
              className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Title</label>
                  <input
                    type="text"
                    required
                    value={candTitle}
                    onChange={(e) => setCandTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Topic</label>
                  <input
                    type="text"
                    value={candTopic}
                    onChange={(e) => setCandTopic(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Difficulty</label>
                  <select
                    value={candDifficulty}
                    onChange={(e) => setCandDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Question Type</label>
                  <input
                    type="text"
                    value={candType}
                    onChange={(e) => setCandType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={candTags}
                    onChange={(e) => setCandTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Learning Objective</label>
                <textarea
                  value={candObjective}
                  onChange={(e) => setCandObjective(e.target.value)}
                  rows="1"
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Question Template Text (Placeholders: `{"{{A}}"}`)
                </label>
                <textarea
                  required
                  value={candTemplateText}
                  onChange={(e) => setCandTemplateText(e.target.value)}
                  rows="2"
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {candOptionsTemplates.map((opt, idx) => (
                  <div key={idx}>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-0.5">
                      Option {["A", "B", "C", "D"][idx]} Template
                    </label>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...candOptionsTemplates];
                        newOpts[idx] = e.target.value;
                        setCandOptionsTemplates(newOpts);
                      }}
                      className="w-full bg-slate-955 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-slate-200 text-sm focus:outline-none font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Correct Option Template
                  </label>
                  <input
                    type="text"
                    required
                    value={candCorrectTemplate}
                    onChange={(e) => setCandCorrectTemplate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Variable Configuration (JSON)</label>
                <textarea
                  required
                  value={candVarSets}
                  onChange={(e) => setCandVarSets(e.target.value)}
                  rows="4"
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none font-mono resize-none"
                />
              </div>

              <div className="px-6 py-4 border-t border-slate-900 flex items-center justify-end gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 bg-slate-900 border border-slate-855 hover:bg-slate-800 text-slate-400 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                >
                  Save Candidate Edits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Concept Edit Modal */}
      {editingConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl border border-slate-800 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Edit Concept Details
              </h3>
              <button
                onClick={() => setEditingConcept(null)}
                className="text-slate-505 hover:text-slate-300 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    topic: conceptTopic,
                    raw_concept: conceptRaw,
                    concept: conceptName,
                    normalized_concept: conceptName,
                    learning_objective: conceptObjective,
                    difficulty: conceptDifficulty,
                    confidence_score: parseFloat(conceptConfidence),
                    extraction_reason: conceptReason,
                    source_snippet: conceptSnippet
                  };

                  const headers = await getAuthHeaders();
                  const response = await axios.put(`${API_BASE_URL}/api/concept-candidates/${editingConcept.id}`, payload, headers);

                  if (response.data.success) {
                    alert("Concept candidate updated successfully!");
                    setEditingConcept(null);
                    await fetchConcepts();
                  }
                } catch (err) {
                  console.error(err);
                  alert(err.response?.data?.error || "Failed to update concept candidate.");
                }
              }}
              className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Topic Name</label>
                  <input
                    type="text"
                    required
                    value={conceptTopic}
                    onChange={(e) => setConceptTopic(e.target.value)}
                    className="w-full bg-slate-955/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Normalized Concept Name</label>
                  <input
                    type="text"
                    required
                    value={conceptName}
                    onChange={(e) => setConceptName(e.target.value)}
                    className="w-full bg-slate-955/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Raw Concept</label>
                <input
                  type="text"
                  required
                  value={conceptRaw}
                  onChange={(e) => setConceptRaw(e.target.value)}
                  className="w-full bg-slate-955/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Difficulty</label>
                  <select
                    value={conceptDifficulty}
                    onChange={(e) => setConceptDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Confidence Score (0.0 - 1.0)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={conceptConfidence}
                    onChange={(e) => setConceptConfidence(e.target.value)}
                    className="w-full bg-slate-955/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Learning Objective</label>
                <textarea
                  value={conceptObjective}
                  onChange={(e) => setConceptObjective(e.target.value)}
                  rows="2"
                  className="w-full bg-slate-955/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none font-sans resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Source Snippet</label>
                <textarea
                  value={conceptSnippet}
                  onChange={(e) => setConceptSnippet(e.target.value)}
                  rows="2"
                  className="w-full bg-slate-955/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none font-sans resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Extraction Justification / Reason</label>
                <textarea
                  value={conceptReason}
                  onChange={(e) => setConceptReason(e.target.value)}
                  rows="2"
                  className="w-full bg-slate-955/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none font-sans resize-none"
                />
              </div>

              <div className="px-6 py-4 border-t border-slate-900 flex items-center justify-end gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setEditingConcept(null)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                >
                  Save Concept Edits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

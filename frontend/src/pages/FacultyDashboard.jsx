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
  Loader2
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function FacultyDashboard() {
  const { currentUser, profileName, logout } = useAuth();

  // State Management
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("list"); // 'list', 'create', 'add-questions', 'results'
  
  // Selected Exam Context
  const [selectedExam, setSelectedExam] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Form States - Create Exam
  const [examTitle, setExamTitle] = useState("");
  const [examDesc, setExamDesc] = useState("");
  const [passingPercentage, setPassingPercentage] = useState("50");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [negativeMarking, setNegativeMarking] = useState("0.00");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Form States - Add Questions
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("0");
  const [tempQuestions, setTempQuestions] = useState([]); // Questions staged locally before submission

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
        <div className="flex items-center gap-2">
          <Award className="h-8 w-8 text-indigo-500 animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Faculty Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-mono">VeriAcad Protocol Portal</p>
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
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
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
                            onClick={() => {
                              setSelectedExam(exam);
                              setTempQuestions([]);
                              setActiveView("add-questions");
                            }}
                            className="px-3.5 py-2 font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition flex items-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5 text-indigo-400" />
                            Questions ({exam.questions_count})
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
                          className="px-3.5 py-2 font-bold bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-xl transition"
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
                  className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition text-sm font-semibold"
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

        {/* VIEW 3: ADD QUESTIONS TO EXAM */}
        {activeView === "add-questions" && selectedExam && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: Add Question Form */}
            <div className="lg:col-span-6 glass-panel rounded-2xl p-6 border border-slate-900 flex flex-col gap-5 shadow-2xl">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-400" />
                Add Question to: {selectedExam.title}
              </h2>

              <div className="flex flex-col gap-4 mt-2">
                {/* Question text */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Question text</label>
                  <textarea
                    placeholder="Enter the question..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows="2"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm resize-none"
                  />
                </div>

                {/* Option inputs */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Option A</label>
                    <input
                      type="text"
                      placeholder="Answer option A..."
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Option B</label>
                    <input
                      type="text"
                      placeholder="Answer option B..."
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Option C</label>
                    <input
                      type="text"
                      placeholder="Answer option C..."
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Option D</label>
                    <input
                      type="text"
                      placeholder="Answer option D..."
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Correct option selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Correct option index</label>
                  <select
                    value={correctOption}
                    onChange={(e) => setCorrectOption(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="0" className="bg-slate-950">Option A</option>
                    <option value="1" className="bg-slate-950">Option B</option>
                    <option value="2" className="bg-slate-950">Option C</option>
                    <option value="3" className="bg-slate-950">Option D</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={addQuestionStaged}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold py-2.5 px-4 rounded-xl transition text-sm mt-2 font-mono"
                >
                  Stage Question
                </button>
              </div>
            </div>

            {/* Right side: Staged Questions Review list */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-slate-400">Staged Questions: {tempQuestions.length}</span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTempQuestions([]);
                      setSelectedExam(null);
                      setActiveView("list");
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveQuestions}
                    disabled={tempQuestions.length === 0}
                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition shadow-lg shadow-indigo-600/10"
                  >
                    Save All to DB
                  </button>
                </div>
              </div>

              {tempQuestions.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-xs border-dashed border border-slate-800/80">
                  No questions staged yet. Configure and Stage questions using the form on the left.
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-1">
                  {tempQuestions.map((q, idx) => (
                    <div key={idx} className="glass-panel rounded-xl p-4 border border-slate-900 flex flex-col gap-3 relative">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-[10px] font-mono font-bold text-slate-500">#Question {idx + 1}</span>
                        <button
                          onClick={() => setTempQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-600 hover:text-rose-400 transition"
                          title="Remove Question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <p className="text-xs text-slate-200 font-bold">{q.questionText}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correctOption === oIdx;
                          return (
                            <div key={oIdx} className={`p-1.5 rounded-lg border ${
                              isCorrect 
                                ? "border-emerald-500/20 bg-emerald-950/5 text-emerald-400 font-bold" 
                                : "border-slate-850 bg-slate-950/20"
                            }`}>
                              {["A", "B", "C", "D"][oIdx]}: {opt} {isCorrect && "✔"}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                              Passed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono">
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
      </main>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, getAuthHeaders } from "../context/AuthContext";
import { 
  Award, 
  Timer, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function AttemptExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [questionId]: optionIndex }
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // Result payload after submission
  const [violationsCount, setViolationsCount] = useState(0);

  const timerRef = useRef(null);

  // Fetch exam details on mount and start/resume attempt session
  useEffect(() => {
    const fetchExamAndStart = async () => {
      try {
        const headers = await getAuthHeaders();
        // 1. Fetch exam metadata
        const metadataRes = await axios.get(`${API_BASE_URL}/api/exams/${examId}`, headers);
        if (metadataRes.data.success) {
          const examData = metadataRes.data.data.exam;
          setExam(examData);
          
          // 2. Start or resume the attempt session
          const startRes = await axios.post(`${API_BASE_URL}/api/exams/${examId}/start`, {}, headers);
          if (startRes.data.success) {
            setQuestions(startRes.data.questions);
            setTimeLeft(startRes.data.timeLeft);
          } else {
            setError("Failed to start exam session.");
          }
        } else {
          setError("Failed to load exam details.");
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "Error connecting to exam server.");
      } finally {
        setLoading(false);
      }
    };

    fetchExamAndStart();
  }, [examId]);

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft <= 0 || result || loading) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, result, loading]);

  // Tab change / visibility change listener for proctoring violations
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !result && !loading && !submitting) {
        setViolationsCount((prev) => prev + 1);
        console.warn("Security alert: Tab focus lost.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [result, loading, submitting]);

  const selectOption = (questionId, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleAutoSubmit = () => {
    console.warn("Time limit reached. Autosubmitting exam answers.");
    submitAnswers(true);
  };

  const submitAnswers = async (isAutosubmit = false) => {
    if (submitting || result) return;
    setSubmitting(true);
    setError("");

    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/exams/${examId}/submit`,
        { answers, violationsCount },
        headers
      );

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError("Failed to grade the exam.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Connection error during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen radial-bg flex flex-col items-center justify-center text-center">
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center border border-slate-800 shadow-2xl">
          <Loader2 className="h-16 w-16 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-slate-200">Loading Exam...</h3>
          <p className="text-xs text-slate-500 mt-2 font-mono">Fetching questions from secure institutional node</p>
        </div>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="min-h-screen radial-bg flex flex-col items-center justify-center text-center px-4">
        <div className="glass-panel rounded-2xl p-8 max-w-md border border-rose-950/20 shadow-2xl">
          <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-4 animate-bounce">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Exam Access Error</h3>
          <p className="text-sm text-rose-400 mt-3">{error}</p>
          <button
            onClick={() => navigate("/student")}
            className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  // RENDER POST-SUBMISSION RESULTS VIEW
  if (result) {
    const isPassed = result.passed;
    return (
      <div className="min-h-screen radial-bg flex flex-col items-center justify-center px-4 py-12">
        <div className="glass-panel w-full max-w-xl p-8 rounded-2xl border border-slate-900 shadow-2xl hover-glow">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            {isPassed ? (
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
                <CheckCircle className="h-10 w-10" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 animate-bounce">
                <XCircle className="h-10 w-10" />
              </div>
            )}

            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              {isPassed ? "Exam Passed Successfully! ✅" : "Exam Attempt Completed"}
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-1">
              {exam?.title} (Attempt #{result.attemptNumber})
            </p>
          </div>

          {/* Scores Overview Card */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 mb-6 grid grid-cols-2 gap-4 font-mono text-center">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Final Grade</span>
              <p className={`text-2xl font-black mt-1 ${isPassed ? "text-emerald-400" : "text-rose-400"}`}>
                {result.percentage}%
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Raw Score</span>
              <p className="text-2xl font-bold text-slate-300 mt-1">
                {result.score} / {result.totalQuestions}
              </p>
            </div>
          </div>

          {isPassed && (
            <div className="flex flex-col gap-4 mb-8">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/5 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Congratulations!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    You have successfully passed this exam with a score of {result.percentage}%.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/student")}
                className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition w-max mx-auto flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Back to Dashboard
              </button>
            </div>
          )}

          {!isPassed && (
            <div className="flex flex-col gap-6 mb-8 text-center">
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                You did not meet the required passing percentage of <span className="font-bold text-rose-400 font-mono">{exam?.passing_percentage}%</span> for this exam. You can re-attempt this exam to improve your score.
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    // Reset attempt state
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    setTimeLeft(exam.duration_minutes * 60);
                    setResult(null);
                  }}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-sm font-semibold transition font-mono"
                >
                  Re-attempt Exam
                </button>
                <button
                  onClick={() => navigate("/student")}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  Back to Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ACTIVE EXAM TEST TAKING INTERFACE
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen radial-bg flex flex-col">
      {/* Exam Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-lg font-bold text-slate-200 truncate max-w-[200px] sm:max-w-md">{exam?.title}</h1>
            <p className="text-xs text-slate-500 font-mono">Passing Grade: {exam?.passing_percentage}%</p>
          </div>
        </div>

        {/* Live Timer & Submit */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${
            timeLeft < 60 
              ? "border-rose-500/30 bg-rose-950/10 text-rose-400 animate-pulse" 
              : "border-slate-800 bg-slate-900 text-slate-300"
          }`}>
            <Timer className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to submit your exam answers?")) {
                submitAnswers();
              }
            }}
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition"
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-3 p-0.5 overflow-hidden">
          <div 
            className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-500 px-1">
          <span>Progress: {answeredCount} / {questions.length} Answered</span>
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
        </div>

        {/* Proctoring Violation Alert */}
        {violationsCount > 0 && (
          <div className="p-4 bg-rose-950/20 border border-rose-800/40 text-rose-400 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-3 animate-pulse">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">Violation detected: Tab switch logged on registry.</p>
              <p className="text-xs text-rose-500/80 font-mono mt-0.5">Total focus violations: {violationsCount}</p>
            </div>
          </div>
        )}

        {/* Penalty Alert if Negative Marking is Enabled */}
        {exam?.negative_marking > 0 && (
          <div className="p-3 bg-amber-950/10 border border-amber-900/30 text-amber-500 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Warning: Negative marking is enabled for this exam. Each wrong answer will deduct <span className="font-bold font-mono">-{exam.negative_marking}</span> points.</span>
          </div>
        )}

        {/* Current Question Card */}
        {currentQuestion && (
          <section className="glass-panel rounded-2xl p-6 md:p-8 border border-slate-900 shadow-2xl flex flex-col gap-6">
            {/* Question Text */}
            <div className="flex gap-4">
              <span className="h-8 w-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm flex-shrink-0">
                Q
              </span>
              <h3 className="text-base font-bold text-slate-200 leading-relaxed pt-0.5">
                {currentQuestion.question_text}
              </h3>
            </div>

            {/* Options List */}
            <div className="flex flex-col gap-3 ml-0 md:ml-12">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === idx;
                const letter = ["A", "B", "C", "D"][idx] || idx + 1;
                
                return (
                  <button
                    key={idx}
                    onClick={() => selectOption(currentQuestion.id, idx)}
                    className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-4 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/10 text-slate-100 shadow-lg"
                        : "border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-900/30 text-slate-400"
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-full border text-[11px] font-mono font-bold flex items-center justify-center transition-all ${
                      isSelected 
                        ? "bg-indigo-600 border-indigo-500 text-white" 
                        : "border-slate-700 bg-slate-900 text-slate-500"
                    }`}>
                      {letter}
                    </span>
                    <span className="text-sm font-semibold">{option}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom Pagination Control */}
        <section className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 rounded-xl transition flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 rounded-xl transition flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </main>
    </div>
  );
}

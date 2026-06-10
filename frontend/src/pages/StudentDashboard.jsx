import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, getAuthHeaders } from "../context/AuthContext";
import {
  Award,
  BookOpen,
  FileText,
  Star,
  User,
  RefreshCw,
  FileQuestion,
  Loader2,
  LogOut,
  Calendar,
  Clock,
  History,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function StudentDashboard() {
  const { currentUser, profileName, logout } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [activeTab, setActiveTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch exams and attempts
  const loadDashboardData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      
      // 1. Fetch Exams (Published/Closed)
      const examsRes = await axios.get(`${API_BASE_URL}/api/exams`, headers);
      if (examsRes.data.success) {
        setExams(examsRes.data.data);
      }

      // 3. Fetch Attempts
      const attemptsRes = await axios.get(`${API_BASE_URL}/api/students/attempts`, headers);
      if (attemptsRes.data.success) {
        setAttempts(attemptsRes.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  // Helper calculations for summary metrics
  const totalAttemptsCount = attempts.length;
  const passedAttemptsCount = attempts.filter(a => a.passed).length;
  const passRate = totalAttemptsCount > 0 
    ? ((passedAttemptsCount / totalAttemptsCount) * 100).toFixed(1)
    : "0";
  const mockAchievementsCount = 2; // Fixed mock achievements for demo richness

  return (
    <div className="min-h-screen radial-bg flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Award className="h-8 w-8 text-amber-500 animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Student Academic Wallet
            </h1>
            <p className="text-xs text-slate-500 font-mono">Academic Dashboard</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition flex items-center gap-1.5 font-mono"
          title="Log Out"
        >
          <LogOut className="h-3.5 w-3.5 text-rose-400" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        
        {/* Student Profile Overview Card */}
        <section className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover-glow">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl uppercase shadow-lg shadow-amber-500/10">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">
                {profileName || "Academic Student"}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">UID: {currentUser?.uid}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition"
              title="Refresh Wallet"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400 px-3 py-2 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Dashboard Active
            </div>
          </div>
        </section>

        {/* Academic Wallet Summary Dashboard */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-5 hover-glow">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-mono">
              Exams Attempted
            </span>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{totalAttemptsCount}</p>
          </div>
          <div className="glass-panel rounded-2xl p-5 hover-glow">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-mono">
              Passed
            </span>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">{passedAttemptsCount}</p>
          </div>
          <div className="glass-panel rounded-2xl p-5 hover-glow">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-mono">
              Pass Rate
            </span>
            <p className="text-3xl font-extrabold text-indigo-400 mt-2">{passRate}%</p>
          </div>
          <div className="glass-panel rounded-2xl p-5 hover-glow">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-mono">
              Achievements
            </span>
            <p className="text-3xl font-extrabold text-amber-500 mt-2">{mockAchievementsCount}</p>
          </div>
        </section>

        {/* Tabs Navigation */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-slate-900 flex gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("exams")}
              className={`pb-3 text-sm font-bold tracking-wide uppercase transition border-b-2 px-1 whitespace-nowrap ${
                activeTab === "exams"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Available Exams
            </button>
            <button
              onClick={() => setActiveTab("attempts")}
              className={`pb-3 text-sm font-bold tracking-wide uppercase transition border-b-2 px-1 whitespace-nowrap ${
                activeTab === "attempts"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Attempt History
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`pb-3 text-sm font-bold tracking-wide uppercase transition border-b-2 px-1 whitespace-nowrap ${
                activeTab === "achievements"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Achievements
            </button>
          </div>

          {/* Tab Content Rendering */}
          <div className="min-h-[350px] flex flex-col w-full">
            {loading && (
              <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center flex-1">
                <Loader2 className="h-12 w-12 text-amber-500 animate-spin mb-4" />
                <p className="text-sm text-slate-400">Loading dashboard data...</p>
              </div>
            )}

            {!loading && error && (
              <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center flex-1 border-rose-950/20">
                <p className="text-sm text-rose-400 font-bold">{error}</p>
              </div>
            )}

            {/* TAB 1: AVAILABLE EXAMS */}
            {!loading && !error && activeTab === "exams" && (
              <div className="w-full">
                {exams.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-xs border-dashed border border-slate-800/80">
                    No active examinations available at this time.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exams.map((exam) => {
                      const isClosed = exam.effectiveStatus === "closed";
                      const isScheduled = exam.effectiveStatus === "scheduled";
                      
                      // Check if student already passed this exam
                      const hasPassedExam = attempts.some(a => a.exam_id === exam.id && a.passed);
                      const myAttempts = attempts.filter(a => a.exam_id === exam.id);
                      
                      return (
                        <div key={exam.id} className="glass-panel rounded-2xl p-6 flex flex-col justify-between gap-6 hover-glow border border-slate-900">
                          {/* Info */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-base font-bold text-slate-200">{exam.title}</h3>
                              {hasPassedExam && (
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
                                  Passed ✅
                                </span>
                              )}
                              {!hasPassedExam && myAttempts.length > 0 && (
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full">
                                  Failed (Attempt #{myAttempts.length})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-3">{exam.description || "No instructions provided."}</p>
                            
                            {/* Exam specs */}
                            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mt-2">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {exam.duration_minutes} Mins
                              </span>
                              <span>•</span>
                              <span>Passing: {exam.passing_percentage}%</span>
                              {exam.negative_marking > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500">Penalty: -{exam.negative_marking}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="border-t border-slate-950 pt-4 flex items-center justify-between gap-4">
                            {/* Schedule info */}
                            <div className="text-[9px] font-mono text-slate-500 flex flex-col">
                              {isScheduled && (
                                <span className="text-sky-400 font-bold">Starts: {new Date(exam.start_time).toLocaleString()}</span>
                              )}
                              {isClosed && (
                                <span className="text-rose-500 font-bold">Ended: {new Date(exam.end_time).toLocaleString()}</span>
                              )}
                              {!isClosed && !isScheduled && exam.end_time && (
                                <span className="text-emerald-400 font-bold">Ends: {new Date(exam.end_time).toLocaleString()}</span>
                              )}
                            </div>

                            {isClosed ? (
                              <button
                                disabled
                                className="px-4 py-2 text-xs font-bold bg-slate-900 border border-slate-800 text-slate-500 rounded-xl cursor-not-allowed"
                              >
                                Exam Closed
                              </button>
                            ) : isScheduled ? (
                              <button
                                disabled
                                className="px-4 py-2 text-xs font-bold bg-slate-900 border border-slate-800 text-slate-500 rounded-xl cursor-not-allowed"
                              >
                                Scheduled
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/student/attempt/${exam.id}`)}
                                className={`px-5 py-2 text-xs font-bold rounded-xl transition font-mono ${
                                  hasPassedExam
                                    ? "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15"
                                }`}
                              >
                                {hasPassedExam ? "Attempt Again" : myAttempts.length > 0 ? "Re-attempt" : "Start Exam"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ATTEMPT HISTORY */}
            {!loading && !error && activeTab === "attempts" && (
              <div className="w-full">
                {attempts.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-xs border-dashed border border-slate-800/80">
                    No attempts registered yet. Go to the "Available Exams" tab to start an exam.
                  </div>
                ) : (
                  <div className="glass-panel rounded-2xl p-6 border border-slate-900 shadow-xl overflow-x-auto w-full bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-900 text-slate-500 font-mono uppercase text-[9px] tracking-wider">
                          <th className="p-4 font-bold">Exam Title</th>
                          <th className="p-4 font-bold text-center">Attempt #</th>
                          <th className="p-4 font-bold text-center">Score</th>
                          <th className="p-4 font-bold text-center">Grade (%)</th>
                          <th className="p-4 font-bold text-center">Result</th>
                          <th className="p-4 font-bold">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {attempts.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-900/30 transition">
                            <td className="p-4 font-bold text-slate-200">{row.exam_title}</td>
                            <td className="p-4 text-center font-mono font-bold">{row.attempt_number}</td>
                            <td className="p-4 text-center font-mono">
                              {row.score} / {row.total_questions}
                            </td>
                            <td className="p-4 text-center font-mono font-bold">{row.percentage}%</td>
                            <td className="p-4 text-center">
                              {row.passed ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-1 w-max mx-auto">
                                  <CheckCircle className="h-3 w-3" /> Passed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono flex items-center gap-1 w-max mx-auto">
                                  <XCircle className="h-3 w-3" /> Failed
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

            {/* TAB 4: ACHIEVEMENTS */}
            {!loading && !error && activeTab === "achievements" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* Achievement 1 */}
                <div className="glass-panel rounded-2xl p-6 flex items-start gap-4 hover-glow border border-slate-900">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full font-mono">
                      ACADEMIC HONORS
                    </span>
                    <h4 className="text-base font-bold text-slate-100 mt-2 mb-1">
                      Dean's List Placement
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Awarded for outstanding academic performance, maintaining an aggregate CGPA above 9.50.
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono block">Issued: 12 Feb 2026</span>
                  </div>
                </div>

                {/* Achievement 2 */}
                <div className="glass-panel rounded-2xl p-6 flex items-start gap-4 hover-glow border border-slate-900">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full font-mono">
                      COMPETITION CHAMPION
                    </span>
                    <h4 className="text-base font-bold text-slate-100 mt-2 mb-1">
                      Genesis Hackathon Champion
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Awarded for securing 1st place in the institutional block-track hackathon for innovative smart contract design.
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono block">Issued: 05 Jan 2026</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

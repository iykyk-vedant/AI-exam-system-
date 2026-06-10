import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, getAuthHeaders } from "../context/AuthContext";
import { 
  Award, 
  User, 
  LogOut, 
  BookOpen, 
  Users, 
  FileSpreadsheet, 
  AlertOctagon, 
  Activity, 
  CheckCircle2, 
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Save
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const { currentUser, profileName, logout } = useAuth();
  
  // Dashboard state
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'violations', or 'settings'

  // Settings states
  const [settings, setSettings] = useState({});
  const [institutionNameInput, setInstitutionNameInput] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/admin/stats`, headers);
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError("Failed to retrieve system statistics.");
      }
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      setError(err.response?.data?.error || "Error connecting to administration services.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch institutional settings
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const settingsResponse = await axios.get(`${API_BASE_URL}/api/admin/settings`, headers);
      if (settingsResponse.data.success) {
        const data = settingsResponse.data.data;
        setSettings(data);
        setInstitutionNameInput(data.institution_name || "");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Trigger loading settings when admin shifts to settings tab
  useEffect(() => {
    if (activeTab === "settings") {
      fetchSettings();
    }
  }, [activeTab]);

  // Handle updating the Institution Name configuration
  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (!institutionNameInput.trim()) return;
    
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/settings`, 
        { key: "institution_name", value: institutionNameInput.trim() },
        headers
      );
      if (response.data.success) {
        setSettingsSuccess(true);
        setSettings(prev => ({ ...prev, institution_name: institutionNameInput.trim() }));
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
      alert(err.response?.data?.error || "Failed to update configuration parameter.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle authenticated downloads of CSV audit datasets
  const handleExportCSV = async (type) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/admin/export/${type}`, {
        ...headers,
        responseType: "blob"
      });

      // Construct dynamic download anchor in DOM
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}_audit.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export failed for type: ${type}`, err);
      alert(`Failed to export ${type} audit log: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen radial-bg flex flex-col items-center justify-center text-center">
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center border border-slate-800 shadow-2xl">
          <Loader2 className="h-16 w-16 text-rose-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-slate-200">Loading Control Center...</h3>
          <p className="text-xs text-slate-500 mt-2 font-mono">Compiling system statistics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen radial-bg flex flex-col items-center justify-center text-center px-4">
        <div className="glass-panel rounded-2xl p-8 max-w-md border border-rose-950/20 shadow-2xl">
          <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-4 animate-bounce">
            <AlertOctagon className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Access Restricted</h3>
          <p className="text-sm text-rose-400 mt-3">{error}</p>
          <button
            onClick={logout}
            className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Circle Calculations for Donut Chart (Radius = 40, Circumference = 251.327)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const passPercentage = stats?.passPercentage || 0;
  const strokeDashoffset = circumference - (circumference * passPercentage) / 100;



  return (
    <div className="min-h-screen radial-bg flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Award className="h-8 w-8 text-rose-500 animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-rose-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Admin Control Center
            </h1>
            <p className="text-xs text-slate-500 font-mono">VeriAcad Protocol System Management</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition flex items-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        
        {/* User Card */}
        <section className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover-glow">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl uppercase shadow-lg shadow-rose-500/10">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">{profileName || "System Administrator"}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Email: {currentUser?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-850 font-mono text-xs">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-2 rounded-lg font-bold transition ${
                  activeTab === "overview" 
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("violations")}
                className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === "violations" 
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Violations
                {stats?.recentViolations.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === "settings" 
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Settings
              </button>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
              Superuser Session Active
            </div>
          </div>
        </section>

        {activeTab === "overview" && (
          <>
            {/* KPI Cards Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              <div className="glass-panel p-4 rounded-xl border border-slate-850 text-center relative overflow-hidden flex flex-col justify-between h-28 hover-glow transition-all">
                <BookOpen className="absolute -right-2 -bottom-2 h-14 w-14 text-slate-900/40" />
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Total Exams</span>
                <p className="text-3xl font-extrabold text-slate-100 z-10">{stats?.totalExams}</p>
                <span className="text-[9px] text-slate-500 z-10">Created drafts/published</span>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-850 text-center relative overflow-hidden flex flex-col justify-between h-28 hover-glow transition-all">
                <Users className="absolute -right-2 -bottom-2 h-14 w-14 text-slate-900/40" />
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Students</span>
                <p className="text-3xl font-extrabold text-slate-100 z-10">{stats?.totalStudents}</p>
                <span className="text-[9px] text-slate-500 z-10">Registered learners</span>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-850 text-center relative overflow-hidden flex flex-col justify-between h-28 hover-glow transition-all">
                <Activity className="absolute -right-2 -bottom-2 h-14 w-14 text-slate-900/40" />
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Attempts</span>
                <p className="text-3xl font-extrabold text-slate-100 z-10">{stats?.totalAttempts}</p>
                <span className="text-[9px] text-slate-500 z-10">Total exams graded</span>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden flex flex-col justify-between h-28 hover-glow bg-rose-950/10 transition-all">
                <AlertOctagon className="absolute -right-2 -bottom-2 h-14 w-14 text-rose-950/20" />
                <span className="text-[10px] text-rose-500 block uppercase tracking-wider font-bold">Violations</span>
                <p className="text-3xl font-extrabold text-rose-400 z-10">{stats?.totalViolations}</p>
                <span className="text-[9px] text-rose-500/70 z-10 font-bold">Proctoring warnings</span>
              </div>
            </section>

            {/* Charts & Audits */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Grading Donut Chart */}
              <div className="glass-panel rounded-2xl p-6 border border-slate-850 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-300 font-mono tracking-tight uppercase mb-1">
                    Grading Performance Analysis
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    Aggregated success rates of all exam attempts recorded in the database ledger.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-6 font-mono">
                  {/* SVG Donut */}
                  <div className="relative h-36 w-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#f43f5e" // rose-500
                        strokeWidth="12"
                      />
                      {stats?.totalAttempts > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="#10b981" // emerald-500
                          strokeWidth="12"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-200">
                        {passPercentage}%
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest">Pass Rate</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 flex-shrink-0"></span>
                      <div>
                        <span className="font-bold text-slate-300">{stats?.passedCount}</span> Passed
                        <span className="text-[10px] text-slate-500 block">({passPercentage}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <span className="h-3 w-3 rounded-full bg-rose-500 flex-shrink-0"></span>
                      <div>
                        <span className="font-bold text-slate-300">{stats?.failedCount}</span> Failed
                        <span className="text-[10px] text-slate-500 block">({stats?.totalAttempts > 0 ? (100 - passPercentage).toFixed(2) : 0}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4 text-[10px] text-slate-500 text-center font-mono">
                  Total Graded Attempt Logs: {stats?.totalAttempts}
                </div>
              </div>
            </section>

            {/* Quick violations preview */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-850">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-300 font-mono tracking-tight uppercase">
                    Recent Proctoring Focus Violations
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Student window/tab switching detected dynamically by VeriAcad's focus tracking API.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("violations")}
                  className="px-3 py-1.5 text-xs font-mono font-bold border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-rose-400 hover:text-rose-300 rounded-lg transition"
                >
                  View Full Audit Log
                </button>
              </div>

              {stats?.recentViolations.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  ✅ No exam violations recorded in system registry.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500">
                        <th className="pb-2">Student</th>
                        <th className="pb-2">Exam Title</th>
                        <th className="pb-2">Score</th>
                        <th className="pb-2 text-center">Violations</th>
                        <th className="pb-2 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-950 text-slate-300">
                      {stats?.recentViolations.slice(0, 5).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-3 pr-2">
                            <span className="font-bold text-slate-200 block">{log.student_name}</span>
                            <span className="text-[10px] text-slate-500 block">{log.student_email}</span>
                          </td>
                          <td className="py-3 pr-2 font-sans font-semibold text-slate-400">{log.exam_title}</td>
                          <td className="py-3 pr-2">
                            <span className={`font-bold ${log.passed ? "text-emerald-500" : "text-rose-500"}`}>
                              {log.percentage}%
                            </span>
                            <span className="text-[10px] text-slate-500 block">{log.passed ? "PASSED" : "FAILED"}</span>
                          </td>
                          <td className="py-3 pr-2 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
                              {log.violations_count}
                            </span>
                          </td>
                          <td className="py-3 text-right text-[10px] text-slate-500">
                            {new Date(log.submitted_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "violations" && (
          /* Full Violations audit log tab */
          <section className="glass-panel rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-900 pb-4 mb-6">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-200 font-mono tracking-tight uppercase">
                  Proctoring Audit Trail Registry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete list of exam submissions with recorded browser window focus switches.
                </p>
              </div>
            </div>

            {stats?.recentViolations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm font-mono flex flex-col items-center gap-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <p>System secure: No proctoring violations logged.</p>
                <span className="text-xs text-slate-600 max-w-sm">
                  Active window visibility monitoring is running on all active student exams.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {stats?.recentViolations.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-950/80 hover:border-slate-800/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs hover-glow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-rose-500/5 border border-rose-950/30 flex items-center justify-center text-rose-500 flex-shrink-0 mt-0.5">
                        <AlertOctagon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-200 font-bold text-sm">{log.student_name}</span>
                          <span className="text-[10px] text-slate-500">({log.student_email})</span>
                        </div>
                        <p className="text-slate-400 font-sans font-semibold mt-1 text-sm">{log.exam_title}</p>
                        
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(log.submitted_at).toLocaleString()}
                          </span>
                          <span>
                            Score: <span className={log.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{log.percentage}%</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 block uppercase tracking-wider">violations</span>
                        <span className="text-lg font-black text-rose-400">
                          {log.violations_count}
                        </span>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
                        log.passed 
                          ? "border-emerald-500/20 bg-emerald-950/10 text-emerald-400" 
                          : "border-rose-500/20 bg-rose-950/10 text-rose-400"
                      }`}>
                        {log.passed ? "PASSED" : "FAILED"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "settings" && (
          /* Settings and Export panel */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System settings main pane */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Institution Settings panel */}
              <section className="glass-panel rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-5">
                  <BookOpen className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-extrabold text-slate-300 font-mono tracking-tight uppercase">
                    Institution Settings Configuration
                  </h3>
                </div>

                {settingsLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs font-mono gap-1">
                    <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                    <span>Loading institutional configuration...</span>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateSettings} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 font-mono">
                      <label htmlFor="institution-name" className="text-xs text-slate-500 uppercase font-bold">
                        Institution Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="institution-name"
                          type="text"
                          value={institutionNameInput}
                          onChange={(e) => setInstitutionNameInput(e.target.value)}
                          placeholder="e.g. VeriAcad Institute"
                          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition outline-none"
                          required
                          disabled={savingSettings}
                        />
                        <button
                          type="submit"
                          disabled={savingSettings || !institutionNameInput.trim()}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                        >
                          {savingSettings ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Update
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-0.5">
                        Note: This value overrides the environment variables. It will be used as the institution header name across the system.
                      </p>
                    </div>

                    {settingsSuccess && (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Institution configuration successfully saved and cached on database registry.</span>
                      </div>
                    )}
                  </form>
                )}
              </section>

            </div>

            {/* CSV Data Export Panel */}
            <div className="flex flex-col gap-6">
              <section className="glass-panel rounded-2xl p-6 border border-slate-800 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                    <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-sm font-extrabold text-slate-300 font-mono tracking-tight uppercase">
                      Data Audits & CSV Exports
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-mono leading-relaxed mb-6">
                    Extract system records directly into formatted spreadsheet tables. Ideal for administrative backups, regulatory grading audits, and proctoring inspections.
                  </p>
                </div>

                <div className="flex flex-col gap-3 font-mono">
                  {/* Export attempts */}
                  <button
                    onClick={() => handleExportCSV("attempts")}
                    className="w-full p-4 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 text-left transition flex items-start gap-3 group hover-glow"
                  >
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/5 border border-indigo-950/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-indigo-300 transition">
                        attempts.csv
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Download all student grades and total raw scores.
                      </span>
                    </div>
                  </button>

                  {/* Export violations */}
                  <button
                    onClick={() => handleExportCSV("violations")}
                    className="w-full p-4 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 text-left transition flex items-start gap-3 group hover-glow"
                  >
                    <div className="h-8 w-8 rounded-lg bg-rose-500/5 border border-rose-950/30 flex items-center justify-center text-rose-400 flex-shrink-0 mt-0.5 group-hover:bg-rose-500/10 group-hover:text-rose-300 transition">
                      <AlertOctagon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-rose-300 transition">
                        violations.csv
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Extract proctoring violations including students emails and tab-switch counts.
                      </span>
                    </div>
                  </button>

                </div>

                <div className="text-[9px] text-slate-600 font-mono text-center mt-6 uppercase border-t border-slate-900 pt-4">
                  Secured CSV Audit Exporter Running
                </div>
              </section>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

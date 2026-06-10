import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Award, User, Mail, Lock, ShieldCheck, Loader2 } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  // State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup(email, password, role, name);
      
      // Redirect based on signed-up role
      if (role === "student") {
        navigate("/student");
      } else if (role === "faculty") {
        navigate("/faculty");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to create an account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen radial-bg flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <Award className="h-10 w-10 text-indigo-500 animate-pulse" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
            VeriAcad Portal
          </h1>
          <p className="text-xs text-slate-500 font-mono">Academic Examination Registry</p>
        </div>
      </div>

      {/* Main Glassmorphic Form Card */}
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-slate-900 shadow-2xl hover-glow">
        <h2 className="text-xl font-bold text-slate-100 text-center mb-1">Create Account</h2>
        <p className="text-xs text-slate-500 text-center mb-6">
          Register to access the secure examination system
        </p>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm"
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="john@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm"
              />
            </div>
          </div>

          {/* Role Dropdown - Restricted to student, faculty */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Account Role
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm appearance-none cursor-pointer"
              >
                <option value="student" className="bg-slate-950 text-slate-200">Student</option>
                <option value="faculty" className="bg-slate-950 text-slate-200">Faculty</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

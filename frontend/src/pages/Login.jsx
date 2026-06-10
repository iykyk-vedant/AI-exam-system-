import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Award, Mail, Lock, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // The login method returns the user, and sets role in state.
      // But let's check role to redirect. The authContext updates the role.
      // Wait, since the role update state might take a tick, the login method inside AuthContext
      // returns the user, but we can also inspect the role set or return it, or query the backend database response.
      // In AuthContext.jsx, login is:
      // const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {}, { headers: { Authorization: `Bearer ${idToken}` } });
      // setUserRole(response.data.data.role);
      // Wait, let's look at AuthContext's login: it returns `user`. 
      // But to redirect properly, we can fetch the user's role directly from the response of login if we modify login to return the role,
      // or we can wait a brief moment/read it.
      // Let's check what authContext.jsx login does:
      // line 94: return user;
      // Wait, it is much cleaner if we make the `login` and `signup` functions in AuthContext.jsx return the user role too, or we can check the context's state. But wait, since setState is asynchronous, reading userRole right after `await login()` might give the old state.
      // Let's modify `AuthContext.jsx` login and signup to return the database user details (role and name) along with user, or we can just return `{ user, role: response.data.data.role }`!
      // Yes! That is extremely safe and prevents race conditions on redirect.
      // Let's check what AuthContext.jsx's login returns: it currently returns `user`.
      // Let's check what Signup returns: it currently returns `user`.
      // Let's make them return `{ user, role }`!
      // But first, let's write `Login.jsx` assuming we can read the role from the resolved promise of `login`.
      // Let's implement `Login.jsx` and then update `AuthContext.jsx` slightly.
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to log in.");
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
        <h2 className="text-xl font-bold text-slate-100 text-center mb-1">Welcome Back</h2>
        <p className="text-xs text-slate-500 text-center mb-6">
          Log in to access your examination portal
        </p>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          try {
            const { role } = await login(email, password);
            // Redirect based on role
            switch (role) {
              case "student":
                navigate("/student");
                break;
              case "faculty":
                navigate("/faculty");
                break;
              case "admin":
                navigate("/admin");
                break;
              default:
                navigate("/student");
            }
          } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Invalid email or password.");
          } finally {
            setLoading(false);
          }
        }} className="flex flex-col gap-4">
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging In...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

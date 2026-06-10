import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, role }) {
  const { currentUser, userRole, loading } = useAuth();

  // If session is still loading, display a premium loading spinner
  if (loading) {
    return (
      <div className="min-h-screen radial-bg flex flex-col items-center justify-center text-center">
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center border border-slate-800 shadow-2xl">
          <Loader2 className="h-16 w-16 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-slate-200">Verifying Session...</h3>
          <p className="text-xs text-slate-500 mt-2 font-mono">Restoring session identity</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required and user does not have it, redirect to their default home
  if (role && userRole !== role) {
    console.warn(`Access denied. Role "${role}" required, but user has "${userRole}". Redirecting...`);
    
    // Default dashboard mapping per role
    switch (userRole) {
      case "student":
        return <Navigate to="/student" replace />;
      case "faculty":
        return <Navigate to="/faculty" replace />;
      case "admin":
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
}

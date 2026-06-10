import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";

const AuthContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);

  // Monitor Firebase Authentication state transitions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setCurrentUser(user);
          const idToken = await user.getIdToken();
          
          // Hydrate user profile and system role from PostgreSQL
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${idToken}` }
          });
          
          setUserRole(response.data.role);
          setProfileName(response.data.name);
        } catch (error) {
          console.error("Session hydration failed:", error.message);
          setUserRole(null);
          setProfileName("");
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setProfileName("");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * Performs user registration in Firebase Auth and registers role/profile details in PostgreSQL.
   */
  async function signup(email, password, role, name) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // Persist details inside Postgres registry
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/register`,
      { name, role },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );

    setUserRole(role);
    setProfileName(name);
    setCurrentUser(user);
    return { user, role };
  }

  /**
   * Authenticates user via Firebase and fetches system role from PostgreSQL.
   */
  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // Fetch details inside Postgres registry
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/login`,
      {},
      { headers: { Authorization: `Bearer ${idToken}` } }
    );

    const resolvedRole = response.data.data.role;
    setUserRole(resolvedRole);
    setProfileName(response.data.data.name);
    setCurrentUser(user);
    return { user, role: resolvedRole };
  }

  /**
   * Logs out user.
   */
  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
    setUserRole(null);
    setProfileName("");
  }

  const value = {
    currentUser,
    userRole,
    profileName,
    loading,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Helper utility to attach bearer tokens to axios requests
export async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const idToken = await user.getIdToken();
  return {
    headers: { Authorization: `Bearer ${idToken}` }
  };
}

// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login({ setUser }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    try {
      const res = await axios.post("http://localhost:3000/login", { username });
      if (res.data.success) {
        setUser(res.data.user);
        navigate("/documents");
      } else {
        setError("Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error");
    }
  };

  const fillRandom = () => {
    const suggestions = ["alice", "bob", "charlie", "dana", "ravi", "nina"];
    const pick =
      suggestions[Math.floor(Math.random() * suggestions.length)] +
      Math.floor(Math.random() * 100);
    setUsername(pick);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 p-8">
        {/* Icon */}
        <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-indigo-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.761 0 5-2.462 5-5.5S14.761 1 12 1 7 3.462 7 6.5 9.239 12 12 12zM4 21.5C4 17.91 7.582 15 12 15s8 2.91 8 6.5V23H4v-1.5z" />
          </svg>
        </div>

        {/* Title + subtitle */}
        <h1 className="text-2xl font-semibold text-center">Welcome to CollabWrite</h1>
        <p className="text-center text-slate-500 mt-2">
          Enter your username to start collaborating
        </p>

        {/* Input */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="e.g. shiv"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={fillRandom}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 active:scale-[.98]"
              title="Suggest a username"
            >
              {/* key icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M14.5 2a5.5 5.5 0 0 0-4.9 8.01L2 17.6V22h4.4l2.2-2.2 1.8 1.8 2.1-2.1-1.8-1.8 1.5-1.5A5.5 5.5 0 1 0 14.5 2zm0 3a2.5 2.5 0 1 1 0 5.001A2.5 2.5 0 0 1 14.5 5z" />
              </svg>
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 active:scale-[.99] transition"
        >
          {/* arrow icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M10 17l5-5-5-5v10zM4 4h2v16H4V4z" />
          </svg>
          Join Collaboration
        </button>

        {/* Footer note (optional, subtle) */}
        <p className="mt-6 text-center text-xs text-slate-400">
          This is a demo of real-time collaborative editing. Multiple users can edit
          documents simultaneously.
        </p>
      </div>
    </div>
  );
}

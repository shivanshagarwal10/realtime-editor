// src/pages/Documents.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createDocument, getDocuments } from "../api";

export default function Documents({ user }) {
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchDocs = async () => {
    try {
      const res = await getDocuments();
      setDocs(res.data);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const handleCreate = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      await createDocument(t);
      setTitle("");
      setShowCreate(false);
      fetchDocs();
    } catch (err) {
      console.error("Error creating document:", err);
    }
  };

  const filteredDocs = docs.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              {/* doc icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V7h3.5L13 3.5z" />
              </svg>
            </div>
            <span className="text-lg font-semibold">CollabWrite</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              {user?.username}
            </span>
            <button
              onClick={() => navigate("/")}
              className="rounded-lg bg-rose-500 text-white px-3 py-1.5 text-sm hover:bg-rose-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Documents</h2>
            <p className="text-slate-500 mt-1">
              Collaborate in real-time with your team
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" />
            </svg>
            New Document
          </button>
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-xl border border-slate-200 bg-white px-11 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M10 2a8 8 0 105.293 14.293l3.707 3.707 1.414-1.414-3.707-3.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z" />
            </svg>
          </div>
        </div>

        {/* Grid */}
        {filteredDocs.length === 0 ? (
          <p className="text-slate-500 mt-8">No documents found.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V7h3.5L13 3.5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-base font-semibold">{doc.title}</div>
                    <div className="text-sm text-slate-500">by {user?.username}</div>
                  </div>
                </div>

                <p className="mt-3 text-slate-600 text-sm line-clamp-2">
                  # {doc.title} Welcome to this collaborative document! Multiple users
                  can edit this content simultaneously…
                </p>

                <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M16 11c1.657 0 3 1.79 3 4s-1.343 4-3 4-3-1.79-3-4 1.343-4 3-4zM8 13c1.105 0 2 .895 2 2s-.895 2-2 2-2-.895-2-2 .895-2 2-2zm3.5-5A2.5 2.5 0 119 5.5 2.5 2.5 0 0111.5 8z" />
                      </svg>
                      3
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 8a1 1 0 011 1v3.382l2.447 1.225a1 1 0 01-.894 1.788l-3-1.5A1 1 0 0111 13V9a1 1 0 011-1z" />
                        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                      </svg>
                      today
                    </span>
                  </div>

                  <div className="flex -space-x-2">
                    {["S", "S", "S"].map((ch, i) => (
                      <span
                        key={i}
                        className={`w-6 h-6 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center
                          ${i === 0 ? "bg-rose-500" : i === 1 ? "bg-emerald-500" : "bg-violet-500"}`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold">Create New Document</h3>

            <div className="mt-4">
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setTitle("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

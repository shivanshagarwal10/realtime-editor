// src/pages/Editor.jsx
import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { getDocument, getDocMembers } from "../api";
import { API_URL } from "../config";

const socket = io(API_URL);

// --- stable color per user for cursor chips ---
const colors = ["#10B981", "#6366F1", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16"];
const userColor = (name = "u") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
};

// --- measure monospace-ish metrics for textarea overlay ---
const measureMetrics = (ta) => {
  const cs = getComputedStyle(ta);
  const lineHeight = parseFloat(cs.lineHeight) || 20;
  const font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  const charWidth = ctx.measureText("MMMMMMMMMM").width / 10;
  return {
    lineHeight,
    charWidth,
    padLeft: parseFloat(cs.paddingLeft) || 0,
    padTop: parseFloat(cs.paddingTop) || 0,
  };
};

export default function Editor({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);

  // avoid clashing with window.document
  const [doc, setDoc] = useState(null);
  const [content, setContent] = useState("");
  const [lastEdited, setLastEdited] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [activeUsers, setActiveUsers] = useState([]); // usernames currently in doc
  const [members, setMembers] = useState([]);         // all known participants

  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimersRef = useRef(new Map());

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // remote cursors: { [username]: index }
  const [remoteCursors, setRemoteCursors] = useState({});
  const metricsRef = useRef({ lineHeight: 20, charWidth: 8, padLeft: 8, padTop: 8 });

  /* ---------------- Load document + sockets ---------------- */
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await getDocument(id);
        setDoc(res.data.document);
        setContent(res.data.document.content || "");
        setLastEdited(res.data.document.last_edited);
        setMessages(res.data.chat || []);
        if (editorRef.current) {
          editorRef.current.value = res.data.document.content || "";
          metricsRef.current = measureMetrics(editorRef.current);
        }
      } catch (err) {
        console.error("Error loading document:", err);
      }
    };

    const fetchMembers = async () => {
      try {
        const res = await getDocMembers(id);
        const uniq = Array.from(new Set([...(res.data || []), user.username]));
        setMembers(uniq);
      } catch (err) {
        console.error("Error loading members:", err);
        setMembers([user.username]);
      }
    };

    fetchDoc();
    fetchMembers();

    // associate socket with username and join room
    socket.emit("login", user.username);
    socket.emit("joinDocument", { documentId: id, username: user.username });

    // updates
    const onDocUpdate = (updatedContent) => {
      setContent(updatedContent);
      if (editorRef.current) editorRef.current.value = updatedContent;
    };
    socket.on("documentUpdate", onDocUpdate);

    const onUsers = (users) => setActiveUsers(users);
    socket.on("docUsersUpdate", onUsers);

    // typing indicators (auto-clear)
    const onUserTyping = (username) => {
      setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
      const timers = typingTimersRef.current;
      if (timers.get(username)) clearTimeout(timers.get(username));
      const t = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== username));
        timers.delete(username);
      }, 1500);
      timers.set(username, t);
    };
    const onUserStopTyping = (username) => {
      const timers = typingTimersRef.current;
      if (timers.get(username)) {
        clearTimeout(timers.get(username));
        timers.delete(username);
      }
      setTypingUsers((prev) => prev.filter((u) => u !== username));
    };
    socket.on("userTyping", onUserTyping);
    socket.on("userStopTyping", onUserStopTyping);

    // live cursor positions
    const onCursorMove = ({ username, index }) => {
      setRemoteCursors((prev) => ({ ...prev, [username]: index }));
    };
    socket.on("cursorMove", onCursorMove);

    // chat
    const onNewMsg = (msg) => setMessages((prev) => [...prev, msg]);
    socket.on("newMessage", onNewMsg);

    return () => {
      socket.emit("leaveDocument", id);
      socket.off("documentUpdate", onDocUpdate);
      socket.off("docUsersUpdate", onUsers);
      socket.off("userTyping", onUserTyping);
      socket.off("userStopTyping", onUserStopTyping);
      socket.off("cursorMove", onCursorMove);
      socket.off("newMessage", onNewMsg);
      typingTimersRef.current.forEach((t) => clearTimeout(t));
      typingTimersRef.current.clear();
    };
  }, [id, user.username]);

  /* ---------------- Presence heartbeat (for online/offline) ---------------- */
  useEffect(() => {
    const beat = () =>
      socket.emit("presence:heartbeat", { documentId: id, username: user.username });
    beat(); // send one immediately
    const t = setInterval(beat, 7000); // < server TTL
    return () => clearInterval(t);
  }, [id, user.username]);

  /* ---------------- Handle edits ---------------- */
  const handleInput = () => {
    const text = editorRef.current.value;
    setContent(text);
    socket.emit("editDocument", { documentId: id, content: text });

    // typing + caret
    socket.emit("userTyping", { documentId: id, username: user.username });
    setLastEdited(new Date().toISOString());
    setTimeout(() => {
      socket.emit("userStopTyping", { documentId: id, username: user.username });
    }, 1200);

    emitCursor();
  };

  /* ---------------- Cursor emitting ---------------- */
  const emitCursor = () => {
    if (!editorRef.current) return;
    const index = editorRef.current.selectionStart || 0;
    socket.emit("cursorMove", { documentId: id, username: user.username, index });
  };

  // keep metrics up to date
  useEffect(() => {
    if (!editorRef.current) return;
    const r = new ResizeObserver(() => {
      metricsRef.current = measureMetrics(editorRef.current);
    });
    r.observe(editorRef.current);
    return () => r.disconnect();
  }, []);

  /* ---------------- Chat send ---------------- */
  const handleSend = () => {
    if (!newMessage.trim()) return;
    socket.emit("chatMessage", {
      documentId: id,
      userId: user.id,
      username: user.username,
      message: newMessage,
    });
    setNewMessage("");
    socket.emit("userStopTyping", { documentId: id, username: user.username });
  };

  /* ---------------- Derived roster: online/offline ---------------- */
  const roster = useMemo(() => {
    const everyone = Array.from(new Set([...(members || []), ...(activeUsers || [])]));
    return everyone.map((name) => ({
      name,
      online: activeUsers.includes(name),
      typing: typingUsers.includes(name),
    }));
  }, [members, activeUsers, typingUsers]);

  /* ---------------- Map index -> pixel position ---------------- */
  const caretToXY = (index) => {
    const ta = editorRef.current;
    if (!ta) return { x: 0, y: 0 };
    const { lineHeight, charWidth, padLeft, padTop } = metricsRef.current;
    const upto = (content || "").slice(0, index);
    const parts = upto.split("\n");
    const row = parts.length - 1;
    const col = parts[parts.length - 1].length;
    return { x: padLeft + col * charWidth, y: padTop + row * lineHeight };
  };

  return (
    <div className="flex h-screen bg-white text-slate-900">
      {/* Main editor column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-slate-200">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <button
                onClick={() => navigate("/documents")}
                className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 19l-7-7 7-7v4h11v6H10v4z" />
                </svg>
                Back to Documents
              </button>

              <div className="mt-1 flex items-center gap-3">
                <h2 className="truncate text-lg font-semibold">
                  {doc ? (doc.title?.trim() || `Document ${id}`) : "Loading..."}
                </h2>

                <span className="text-xs text-slate-500">
                  Last edited{" "}
                  {lastEdited
                    ? new Date(lastEdited).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "just now"}
                </span>
                <span className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H7a2 2 0 00-2 2v2h14V5a2 2 0 00-2-2zm2 6H5v10a2 2 0 002 2h10a2 2 0 002-2V9z" />
                  </svg>
                  Auto-saved
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>

              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4a2 2 0 00-2 2v15l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
                </svg>
                Chat
              </button>
            </div>
          </div>

          <div className="px-6 pb-3 text-sm text-slate-600 flex items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.657 0 3 1.79 3 4s-1.343 4-3 4-3-1.79-3-4 1.343-4 3-4zM8 13c1.105 0 2 .895 2 2s-.895 2-2 2-2-.895-2-2 .895-2 2-2zM11.5 5.5A2.5 2.5 0 119 8a2.5 2.5 0 012.5-2.5z" />
              </svg>
              {activeUsers.length || 0} active users
            </span>
          </div>
        </div>

        {/* Editable area + cursor overlay */}
        <div className="relative flex-1">
          <textarea
            ref={editorRef}
            value={content}
            onChange={handleInput}
            onKeyUp={emitCursor}
            onClick={emitCursor}
            onSelect={emitCursor}
            className="absolute inset-0 w-full h-full px-6 py-6 outline-none text-[15px] leading-7 font-mono whitespace-pre"
            placeholder="Start typing to see the collaboration in action!"
          />
          {/* overlay (no pointer events) */}
          <div className="absolute inset-0 pointer-events-none px-6 py-6">
            {Object.entries(remoteCursors)
              .filter(([name]) => name !== user.username && activeUsers.includes(name))
              .map(([name, index]) => {
                const { x, y } = caretToXY(index || 0);
                const chip = typingUsers.includes(name) ? `${name} (typing…)` : name;
                const bg = userColor(name);
                return (
                  <div
                    key={name}
                    style={{ transform: `translate(${x}px, ${y - 18}px)` }}
                    className="absolute text-xs text-white rounded px-1.5 py-[2px]"
                  >
                    <span className="rounded px-1.5 py-[2px] shadow" style={{ backgroundColor: bg }}>
                      {chip}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Right sidebar (Chat & Users) */}
      {sidebarOpen && (
        <aside className="w-88 max-w-[360px] min-w-[320px] border-l border-slate-200 bg-white flex flex-col">
          {/* Tabs header */}
          <div className="px-4 border-b border-slate-200">
            <div className="flex items-center">
              <button className="flex-1 py-3 text-sm font-semibold text-slate-900 border-b-2 border-indigo-600">
                Chat
              </button>
              <button className="flex-1 py-3 text-sm text-slate-500">
                Users ({roster.length})
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[11px] text-slate-500 mb-1">
                  <span className="font-medium text-slate-800">{msg.username || "Unknown"}</span>{" "}
                  ·{" "}
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
                <div className="max-w-[92%] rounded-xl bg-slate-100 px-3 py-2 text-[13px] text-slate-800">
                  {msg.message}
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 p-3 flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                socket.emit("userTyping", { documentId: id, username: user.username });
              }}
              onBlur={() => socket.emit("userStopTyping", { documentId: id, username: user.username })}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              className="inline-flex h-9 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              title="Send"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </button>
          </div>

          {/* Users list (online + offline greyed) */}
          <div className="border-t border-slate-200 px-4 py-3">
            <h4 className="text-sm font-semibold mb-2">Users in Document</h4>
            <div className="space-y-2">
              {roster.map(({ name, online, typing }) => (
                <div key={name} className={`flex items-center gap-2 text-sm ${online ? "" : "opacity-50"}`}>
                  <div
                    className="w-7 h-7 rounded-full text-white text-xs font-bold grid place-items-center"
                    style={{ backgroundColor: userColor(name) }}
                  >
                    {name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-slate-800">{name}</span>
                  {online ? (
                    typing ? (
                      <span className="ml-auto text-[11px] text-indigo-600">Typing…</span>
                    ) : (
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Online
                      </span>
                    )
                  ) : (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      Offline
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

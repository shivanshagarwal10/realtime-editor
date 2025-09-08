// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const Redis = require("ioredis");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // local dev
      "https://realtime-editor-i7hwo0mev-shivansh-agarwals-projects-8da7490e.vercel.app" // your Vercel frontend domain
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});


app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const redis = new Redis(process.env.REDIS_URL, {
  connectTimeout: 10000,
});
const PRESENCE_TTL = 20; // seconds; heartbeat should be < this
const room = (id) => `doc_${id}`;
const activeSet = (id) => `doc:${id}:active`;               // users currently active in doc
const memberSet = (id) => `doc:${id}:members`;              // users who ever opened doc
const presenceKey = (id, u) => `doc:${id}:presence:${u}`;   // per-user TTL key

async function pruneAndGetActive(documentId) {
  const users = await redis.smembers(activeSet(documentId));
  if (!users.length) return [];
  const pipeline = redis.multi();
  users.forEach((u) => pipeline.exists(presenceKey(documentId, u)));
  const results = await pipeline.exec(); // [[null,1],[null,0]...]
  const still = [];
  for (let i = 0; i < users.length; i++) {
    const alive = results[i][1] === 1;
    if (alive) still.push(users[i]);
    else await redis.srem(activeSet(documentId), users[i]);
  }
  return still;
}

/* ---------------- AUTH ---------------- */
app.post("/login", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  try {
    const result = await pool.query(
      `INSERT INTO users (username)
       VALUES ($1)
       ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
       RETURNING *`,
      [username]
    );
    // optional global presence set
    await redis.sadd("active_users", username);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/active-users", async (_req, res) => {
  try {
    res.json(await redis.smembers("active_users"));
  } catch (err) {
    console.error("Error fetching active users:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DOCUMENTS ---------------- */
// Create
app.post("/documents", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });

  try {
    const result = await pool.query(
      "INSERT INTO documents (title, content) VALUES ($1, $2) RETURNING *",
      [title, ""]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating doc:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// List
app.get("/documents", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM documents ORDER BY last_edited DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error listing docs:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// One document + recent chat
app.get("/documents/:id", async (req, res) => {
  const { id } = req.params;
  const chatLimit = parseInt(req.query.limit, 10) || 20;

  try {
    const docResult = await pool.query("SELECT * FROM documents WHERE id = $1", [id]);
    if (docResult.rowCount === 0) return res.status(404).json({ error: "Document not found" });

    const chatResult = await pool.query(
      `SELECT c.id, c.message, c.created_at, u.username
         FROM chat_messages c
         JOIN users u ON c.user_id = u.id
        WHERE c.document_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2`,
      [id, chatLimit]
    );

    res.json({ document: docResult.rows[0], chat: chatResult.rows });
  } catch (err) {
    console.error("Error loading doc:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Members (ever joined OR chatted) – used by frontend to show greyed "Offline"
app.get("/documents/:id/members", async (req, res) => {
  const { id } = req.params;
  try {
    const [membersRedis, activeRedis] = await Promise.all([
      redis.smembers(memberSet(id)),
      redis.smembers(activeSet(id)),
    ]);
    const chatRows = await pool.query(
      `SELECT DISTINCT u.username
         FROM chat_messages c
         JOIN users u ON c.user_id = u.id
        WHERE c.document_id = $1`,
      [id]
    );
    const fromChat = chatRows.rows.map((r) => r.username);
    const combined = [...new Set([...membersRedis, ...activeRedis, ...fromChat])];
    res.json(combined);
  } catch (err) {
    console.error("Error fetching members:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- CHAT ---------------- */
// Single chat endpoint with optional limit
app.get("/documents/:id/chat", async (req, res) => {
  const { id } = req.params;
  const chatLimit = parseInt(req.query.limit, 10) || 20;

  try {
    const result = await pool.query(
      `SELECT c.id, c.message, c.created_at, u.username
         FROM chat_messages c
         JOIN users u ON c.user_id = u.id
        WHERE c.document_id = $1
        ORDER BY c.created_at ASC
        LIMIT $2`,
      [id, chatLimit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching chat:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/documents/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { user_id, message } = req.body;
  if (!user_id || !message) return res.status(400).json({ error: "user_id and message required" });

  try {
    const result = await pool.query(
      "INSERT INTO chat_messages (document_id, user_id, message) VALUES ($1, $2, $3) RETURNING *",
      [id, user_id, message]
    );
    await pool.query("UPDATE documents SET last_edited = NOW() WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding chat:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- SOCKET.IO ---------------- */
io.on("connection", (socket) => {
  console.log("✅ User connected");

  // optional global presence
  socket.on("login", async (username) => {
    socket.username = username;
    await redis.sadd("active_users", username);
    io.emit("activeUsersUpdate", await redis.smembers("active_users"));
  });

  // Join a document room, mark as member, and mark active w/ TTL
  socket.on("joinDocument", async ({ documentId, username }) => {
    socket.join(room(documentId));
    socket.documentId = documentId;
    socket.username = username;

    await redis.sadd(memberSet(documentId), username);
    await redis.sadd(activeSet(documentId), username);
    await redis.set(presenceKey(documentId, username), "1", "EX", PRESENCE_TTL);

    const active = await pruneAndGetActive(documentId);
    io.to(room(documentId)).emit("docUsersUpdate", active);
  });

  // Heartbeat from client to keep user "active"
  socket.on("presence:heartbeat", async ({ documentId, username }) => {
    await redis.set(presenceKey(documentId, username), "1", "EX", PRESENCE_TTL);
    await redis.sadd(activeSet(documentId), username);
    const active = await pruneAndGetActive(documentId);
    io.to(room(documentId)).emit("docUsersUpdate", active);
  });

  // Leave document: mark inactive (keep membership for greyed display)
  socket.on("leaveDocument", async (documentId) => {
    socket.leave(room(documentId));
    if (!socket.username) return;
    await redis.srem(activeSet(documentId), socket.username);
    await redis.del(presenceKey(documentId, socket.username));
    const active = await pruneAndGetActive(documentId);
    io.to(room(documentId)).emit("docUsersUpdate", active);
  });

  // Live cursors
  socket.on("cursorMove", ({ documentId, username, index }) => {
    socket.to(room(documentId)).emit("cursorMove", { username, index });
  });

  // Typing indicators
  socket.on("userTyping", ({ documentId, username }) => {
    io.to(room(documentId)).emit("userTyping", username);
  });
  socket.on("userStopTyping", ({ documentId, username }) => {
    io.to(room(documentId)).emit("userStopTyping", username);
  });

  // Realtime editing (broadcast immediately, persist async)
  socket.on("editDocument", ({ documentId, content }) => {
    try {
      io.to(room(documentId)).emit("documentUpdate", content);
      pool
        .query(
          "UPDATE documents SET content = $1, last_edited = NOW() WHERE id = $2",
          [content, documentId]
        )
        .catch((err) => console.error("DB update err:", err.message));
    } catch (err) {
      console.error("Error updating doc:", err.message);
    }
  });

  // Chat
  socket.on("chatMessage", async ({ documentId, userId, message }) => {
    try {
      const r = await pool.query(
        "INSERT INTO chat_messages (document_id, user_id, message) VALUES ($1, $2, $3) RETURNING *",
        [documentId, userId, message]
      );
      const saved = r.rows[0];
      const u = await pool.query("SELECT username FROM users WHERE id = $1", [userId]);
      const username = u.rows[0]?.username || "Unknown";
      io.to(room(documentId)).emit("newMessage", { ...saved, username });
      await pool.query("UPDATE documents SET last_edited = NOW() WHERE id = $1", [documentId]);
    } catch (err) {
      console.error("Error saving chat:", err.message);
    }
  });

  // Disconnect: mark inactive for the room this socket was in,
  // and remove from global active_users (optional).
  socket.on("disconnect", async () => {
    if (socket.username) await redis.srem("active_users", socket.username);
    if (socket.username && socket.documentId) {
      await redis.srem(activeSet(socket.documentId), socket.username);
      await redis.del(presenceKey(socket.documentId, socket.username));
      const active = await pruneAndGetActive(socket.documentId);
      io.to(room(socket.documentId)).emit("docUsersUpdate", active);
    }
    console.log("❌ User disconnected");
  });
});

/* ---------------- START ---------------- */
server.listen(3000, () => {
  console.log("✅ Backend running at http://localhost:3000");
});

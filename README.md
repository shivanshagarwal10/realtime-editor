📄 CollabWrite – Real-Time Collaborative Document Editor
🚀 Overview

CollabWrite is a full-stack real-time collaborative document editor.
It allows multiple users to edit documents together, chat in real time, and see who’s online/offline with live typing + cursor indicators.

Built as part of the Full Stack Developer Assignment.

✨ Features

🔑 Authentication – Simple username login (new users prompted, existing auto-login).

📝 Collaborative Editing – Multiple users can edit a document in real time.

📌 Presence – Shows who is active in the document.

Online users → colored avatar + cursor.

Offline users → greyed out but listed.

🖱 Live Cursors – Each active user has a unique cursor + username label.

💬 Chat System – In-document chat with typing indicators.

🔗 Shareable Documents – Each document has its own ID + link.

💾 Persistence – Documents and chat history stored in PostgreSQL.

⚡ Realtime Infrastructure – Built with Socket.IO + Redis pub/sub for live sync.

🛠 Tech Stack

Frontend

React (Vite)

TailwindCSS

Backend

Node.js + Express

Socket.IO (real-time events)

Database & Infra

PostgreSQL – persistent data (users, documents, chat)

Redis – presence + active users tracking

📂 Project Structure
/client   → React frontend
/server   → Express + Socket.IO backend

⚙️ Setup Instructions
1️⃣ Clone & Install
git clone <your-repo-url>
cd project


Frontend:

cd client
npm install


Backend:

cd server
npm install

2️⃣ Configure DB

PostgreSQL setup:

CREATE DATABASE realtime_editor;

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL
);

-- Documents
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  last_edited TIMESTAMP DEFAULT NOW()
);

-- Chat
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  document_id INT REFERENCES documents(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


Update DB credentials in server.js.

3️⃣ Run the Backend
cd server
node server.js


Backend running at: http://localhost:3000

4️⃣ Run the Frontend
cd client
npm run dev


Frontend running at: http://localhost:5173

📸 Screenshots (to include in submission)

Login screen

Document list

Document editing with multiple users

Chat + presence sidebar

Offline users greyed out

✅ Assignment Deliverables

Real-time editing with live cursors

Presence (online/offline)

Chat with typing indicators

Persistent DB for docs & chat

Shareable document links
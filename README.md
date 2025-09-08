# Realtime Editor ✍️

A real-time collaborative text editor built with **React (Vite)**, **Node.js/Express**, **PostgreSQL**, **Redis**, and **Socket.IO**.
Multiple users can create, join, and collaboratively edit documents in real time with live cursors and chat.

---

## 🚀 Features

* 🔑 User login with unique usernames
* 📄 Create and manage documents
* 👥 Real-time collaboration (multiple users editing simultaneously)
* 💬 Chat within documents
* ✨ Live presence (see who’s online/offline)
* 🖱️ Live cursor tracking
* 💾 PostgreSQL for persistence
* ⚡ Redis for presence & caching
* 🌍 Deployed with **Render** (backend) and **Vercel** (frontend)

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), TailwindCSS
* **Backend**: Node.js, Express
* **Database**: PostgreSQL (Render)
* **Cache/Presence**: Redis (Render Key-Value)
* **Realtime**: Socket.IO
* **Deployment**:

  * Backend → Render
  * Frontend → Vercel

---

## 📂 Project Structure

```
realtime-editor/
│
├── backend/           # Express + Socket.IO server
│   ├── server.js
│   ├── package.json
│   └── schema.sql     # Database schema
│
├── frontend/          # React (Vite) app
│   ├── src/
│   │   ├── pages/     # React pages (Login, Documents, Editor)
│   │   └── config.js  # API_URL setup
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## ⚙️ Setup (Local Development)

### 1. Clone Repo

```bash
git clone https://github.com/<your-username>/realtime-editor.git
cd realtime-editor
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>
REDIS_URL=redis://<user>:<password>@<host>:6379
```

Run migrations:

```bash
psql <DATABASE_URL> -f schema.sql
```

Start server:

```bash
npm start
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` in `frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

Start frontend:

```bash
npm run dev
```

---

## 🌍 Deployment

### Backend (Render)

* Add environment variables in Render dashboard:

  * `DATABASE_URL`
  * `REDIS_URL`
  * `PORT=3000`
* Deploy backend service.

### Frontend (Vercel)

* Add environment variable:

  * `VITE_API_URL=https://<your-render-backend-url>`
* Deploy frontend.

---

## 📜 Database Schema

`schema.sql`:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  last_edited TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  document_id INT REFERENCES documents(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 Testing

1. Run backend (`npm start` in backend folder)
2. Run frontend (`npm run dev` in frontend folder)
3. Open `http://localhost:5173`, login, create a doc, and start collaborating 🎉

---

## 👨‍💻 Author

Made by Shivansh Agarwal (https://github.com/shivanshagarwal10) 


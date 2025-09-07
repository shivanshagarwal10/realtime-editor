import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Documents from "./pages/Documents";
import Editor from "./pages/Editor";

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <Routes>
      <Route path="/" element={<Login setUser={setUser} />} />
      <Route path="/documents" element={<Documents user={user} />} />
      <Route path="/documents/:id" element={<Editor user={user} />} />
    </Routes>
  );
}

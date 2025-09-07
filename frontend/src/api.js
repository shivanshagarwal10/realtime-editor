import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000",
});

// Auth
export const loginUser = (username) => API.post("/login", { username });

// Documents
export const getDocuments = () => API.get("/documents");
export const createDocument = (title) => API.post("/documents", { title });
export const getDocument = (id) => API.get(`/documents/${id}`);
export const getDocMembers = (id) => API.get(`/documents/${id}/members`);

// Chat
export const getChat = (id, limit = 20) =>
  API.get(`/documents/${id}/chat?limit=${limit}`);
export const sendChat = (id, user_id, message) =>
  API.post(`/documents/${id}/chat`, { user_id, message });

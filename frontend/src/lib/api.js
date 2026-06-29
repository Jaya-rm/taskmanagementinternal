import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const PIN_KEY = "relay:owner_pin";

export const getOwnerPin = () => localStorage.getItem(PIN_KEY) || "";
export const setOwnerPin = (p) => localStorage.setItem(PIN_KEY, p || "");
export const clearOwnerPin = () => localStorage.removeItem(PIN_KEY);

const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  const pin = getOwnerPin();
  if (pin) config.headers["X-Owner-Pin"] = pin;
  return config;
});

export const api = {
  // auth
  checkPasscode: (passcode) => client.post("/auth/team", { passcode }).then((r) => r.data.ok),
  checkOwnerPin: (pin) => client.post("/auth/owner", { pin }).then((r) => r.data.ok),
  // settings
  getSettings: () => client.get("/settings").then((r) => r.data),
  getSettingsFull: () => client.get("/settings/full").then((r) => r.data),
  updateSettings: (payload) => client.put("/settings", payload).then((r) => r.data),
  // members
  listMembers: () => client.get("/members").then((r) => r.data),
  createMember: (m) => client.post("/members", m).then((r) => r.data),
  updateMember: (id, m) => client.put(`/members/${id}`, m).then((r) => r.data),
  deleteMember: (id) => client.delete(`/members/${id}`).then((r) => r.data),
  // tasks
  listTasks: () => client.get("/tasks").then((r) => r.data),
  createTask: (t, actor) =>
    client.post("/tasks", t, { headers: { "X-Actor": actor || "" } }).then((r) => r.data),
  updateTask: (id, payload) => client.put(`/tasks/${id}`, payload).then((r) => r.data),
  deleteTask: (id) => client.delete(`/tasks/${id}`).then((r) => r.data),
  addComment: (id, author, text) =>
    client.post(`/tasks/${id}/comment`, { author, text }).then((r) => r.data),
  // logs
  listLogs: () => client.get("/logs").then((r) => r.data),
  resetSeed: () => client.post("/seed/reset").then((r) => r.data),
};

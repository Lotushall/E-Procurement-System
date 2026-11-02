import { setupServer } from "msw/node";

// ไม่มี handler ตั้งต้น — แต่ละ test ประกาศ response ที่ต้องการเองด้วย server.use(...)
export const server = setupServer();

export const API_URL = "http://localhost:3000";

export const apiUrl = (path: string) => `${API_URL}${path}`;

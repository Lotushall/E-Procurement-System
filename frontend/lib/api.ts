import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;


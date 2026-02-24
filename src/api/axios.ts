import axios from "axios";

const TOKEN_KEY = "auth_token";
const API_URL =
  import.meta.env.VITE_API_URL || "https://backend-papiroexport.onrender.com";

const api = axios.create({
  baseURL: API_URL,
});

let unauthorizedHandler: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getAuthToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const registerUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export default api;

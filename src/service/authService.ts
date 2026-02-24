import api, { setAuthToken } from "../api/axios";
import type { AuthUser, LoginResponse, RegisterRequest } from "../types/auth";

export const loginRequest = async (username: string, password: string): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await api.post<LoginResponse>("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  setAuthToken(response.data.access_token);
  return response.data;
};

export const registerRequest = async (payload: RegisterRequest): Promise<AuthUser> => {
  const response = await api.post<AuthUser>("/auth/register", payload);
  return response.data;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await api.get<AuthUser>("/auth/me");
  return response.data;
};

export const logoutRequest = () => {
  setAuthToken(null);
};

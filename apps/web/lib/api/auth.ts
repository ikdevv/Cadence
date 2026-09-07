import type { AuthSession, LoginInput, RegisterInput } from "@cadence/shared";
import { apiClient } from "./client";

export function login(data: LoginInput) {
  return apiClient.post<AuthSession>("/auth/login", data);
}

export function register(data: RegisterInput) {
  return apiClient.post<AuthSession>("/auth/register", data);
}

export function logout(refreshToken: string) {
  return apiClient.post("/auth/logout", { refreshToken });
}

import type { CreateProjectInput, Project } from "@cadence/shared";
import { apiClient } from "./client";

export function listProjects(includeInactive?: boolean) {
  return apiClient.get<Project[]>(
    `/projects${includeInactive ? "?includeInactive=true" : ""}`,
  );
}

export function createProject(data: CreateProjectInput) {
  return apiClient.post("/projects", data);
}

export function updateProject(id: string, data: CreateProjectInput) {
  return apiClient.patch(`/projects/${id}`, data);
}

export function activateProject(id: string) {
  return apiClient.patch(`/projects/${id}`, { isActive: true });
}

export function deactivateProject(id: string) {
  return apiClient.delete(`/projects/${id}`);
}

/** Irreversible — deletes every report filed against the project along with it. */
export function deleteProjectPermanently(id: string) {
  return apiClient.delete(`/projects/${id}/permanent`);
}

import type {
  AuthSession,
  CreateInvitationInput,
  Invitation,
  ValidateInvitationResult,
} from "@cadence/shared";
import { apiClient } from "./client";

export function listInvitations() {
  return apiClient.get<Invitation[]>("/invitations");
}

export function validateInvitation(token: string) {
  return apiClient.get<ValidateInvitationResult>(
    `/invitations/validate/${encodeURIComponent(token)}`,
  );
}

export function acceptInvitation(data: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  return apiClient.post<AuthSession>("/invitations/accept", data);
}

export function createInvitation(data: CreateInvitationInput) {
  return apiClient.post<Invitation>("/invitations", data);
}

export function resendInvitation(id: string) {
  return apiClient.post(`/invitations/${id}/resend`);
}

export function cancelInvitation(id: string) {
  return apiClient.post(`/invitations/${id}/cancel`);
}

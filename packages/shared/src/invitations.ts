import { z } from "zod";
import { AuthSessionSchema, RoleSchema } from "./auth";

// Mirrors the Prisma `InvitationStatus` enum in apps/api/prisma/invitations.prisma.
export const InvitationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "CANCELLED",
]);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: RoleSchema,
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

export const InvitationSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  status: InvitationStatusSchema,
  invitedById: z.string(),
  invitedByName: z.string(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

export const ValidateInvitationResultSchema = z.discriminatedUnion("valid", [
  z.object({
    valid: z.literal(true),
    email: z.string().email(),
    role: RoleSchema,
    expiresAt: z.string(),
  }),
  z.object({
    valid: z.literal(false),
    reason: z.enum(["INVALID", "EXPIRED", "CANCELLED", "ACCEPTED"]),
  }),
]);
export type ValidateInvitationResult = z.infer<
  typeof ValidateInvitationResultSchema
>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Must be at least 8 characters"),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

export const AcceptInvitationResultSchema = AuthSessionSchema;

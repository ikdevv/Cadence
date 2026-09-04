import { z } from "zod";

// Mirrors the Prisma `Role` enum in apps/api/prisma/auth.prisma — keep in sync manually,
// since the generated Prisma client isn't importable from this package.
export const RoleSchema = z.enum(["MEMBER", "MANAGER", "ADMIN"]);
export type Role = z.infer<typeof RoleSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: RoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: AuthUserSchema,
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

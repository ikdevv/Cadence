import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  color: z.string(),
  isActive: z.boolean(),
  reportCount: z.number().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  code: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9-]+$/, "Uppercase letters, digits and dashes only"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #2563EB")
    .optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

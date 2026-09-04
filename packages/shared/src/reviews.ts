import { z } from "zod";

export const ApproveSchema = z.object({
  comment: z.string().max(2000).optional(),
});
export type ApproveInput = z.infer<typeof ApproveSchema>;

/** The comment is required: a rejection with no explanation is a broken workflow. */
export const RequestChangesSchema = z.object({
  comment: z
    .string()
    .min(5, "Explain what needs correcting")
    .max(2000),
});
export type RequestChangesInput = z.infer<typeof RequestChangesSchema>;

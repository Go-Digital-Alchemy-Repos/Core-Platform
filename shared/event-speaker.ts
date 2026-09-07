import { z } from "zod";
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
export const eventSpeakerInputSchema = z
  .object({
    name: z.string().trim().min(1, "Speaker name is required").max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .nullable()
      .optional(),
    description: optionalText(20000),
    email: z
      .union([z.literal(""), z.string().trim().email().max(320)])
      .nullable()
      .optional(),
    phone: optionalText(100),
    websiteUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .url()
          .max(2048)
          .refine((value) => /^https?:\/\//i.test(value), "Use an HTTP or HTTPS website URL"),
      ])
      .nullable()
      .optional(),
    imageUrl: optionalText(2048),
  })
  .strict();

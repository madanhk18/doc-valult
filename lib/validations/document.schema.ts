import { z } from "zod";

export const documentFormSchema = z.object({
  name: z.string().trim().min(1, "Document name is required").max(200),
  // Intentionally not `z.enum(DOCUMENT_TYPES)`: selecting "Other / Custom Document"
  // in the UI substitutes a free-text custom type name as the submitted value
  // (see components/documents/document-form.tsx), so any non-empty string is a
  // legitimate `type` here, not just one of the predefined DOCUMENT_TYPES.
  type: z.string().trim().min(1, "Document type is required").max(100),
  docNumber: z.string().trim().max(100).optional().or(z.literal("")),
  holderName: z.string().trim().max(200).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;

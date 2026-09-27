"use client";

import { useRef, useState, useTransition } from "react";
import { DOCUMENT_TYPES, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DocumentWithStatus } from "@/lib/queries/documents";

type Props = {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initialValues?: Partial<DocumentWithStatus>;
  requireFile?: boolean;
};

export function DocumentForm({ action, initialValues, requireFile = true }: Props) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function validateFile(file: File | undefined) {
    if (!file) return requireFile ? "A document file is required" : null;
    if (!ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
      return "File must be a PDF, JPG, or PNG";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) return "File must be 10MB or smaller";
    return null;
  }

  function handleSubmit(formData: FormData) {
    const file = formData.get("file") as File | null;
    const error = validateFile(file && file.size > 0 ? file : undefined);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 max-w-xl">
      {requireFile && (
        <div className="space-y-2">
          <Label htmlFor="file">Document file (PDF, JPG, PNG — max 10MB)</Label>
          <Input id="file" name="file" type="file" accept={ACCEPTED_FILE_TYPES.join(",")} />
          {fileError && <p className="text-sm text-destructive">{fileError}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Document Name</Label>
        <Input id="name" name="name" defaultValue={initialValues?.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Document Type</Label>
        <Select name="type" defaultValue={initialValues?.type}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="docNumber">Document Number</Label>
          <Input id="docNumber" name="docNumber" defaultValue={initialValues?.doc_number ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="holderName">Holder Name</Label>
          <Input id="holderName" name="holderName" defaultValue={initialValues?.holder_name ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue / Start Date</Label>
          <Input id="issueDate" name="issueDate" type="date" defaultValue={initialValues?.issue_date ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry / End Date</Label>
          <Input id="expiryDate" name="expiryDate" type="date" defaultValue={initialValues?.expiry_date ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input id="tags" name="tags" defaultValue={initialValues?.tags?.join(", ") ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={initialValues?.notes ?? ""} rows={3} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Document"}
      </Button>
    </form>
  );
}

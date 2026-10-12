"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { DOCUMENT_TYPES, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FilePicker } from "./file-picker";
import { docStyle } from "@/lib/doc-style";
import type { DocumentWithStatus } from "@/lib/queries/documents";

const CUSTOM_TYPE = DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];

type Props = {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initialValues?: Partial<DocumentWithStatus>;
  requireFile?: boolean;
};

export function DocumentForm({ action, initialValues, requireFile = true }: Props) {
  const initialType = initialValues?.type;
  const isInitialCustom = Boolean(
    initialType && !(DOCUMENT_TYPES as readonly string[]).includes(initialType),
  );

  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(
    isInitialCustom ? CUSTOM_TYPE : (initialType ?? ""),
  );
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const file = formData.get("file") as File | null;
    const error = validateFile(file && file.size > 0 ? file : undefined);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);

    if (formData.get("type") === CUSTOM_TYPE) {
      const customType = (formData.get("customType")?.toString() ?? "").trim();
      if (!customType) {
        toast.error("Custom document type name is required");
        return;
      }
      formData.set("type", customType);
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-5">
      {requireFile && <FilePicker name="file" error={fileError} />}

      <Section title="What is it?">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initialValues?.name}
            placeholder="e.g. My driving licence"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            name="type"
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as string)}
          >
            <SelectTrigger id="type" className="w-full">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => {
                const { icon: Icon, color } = docStyle(type);
                return (
                  <SelectItem key={type} value={type}>
                    <Icon className="size-4" style={{ color }} />
                    {type}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedType === CUSTOM_TYPE && (
          <div className="space-y-2">
            <Label htmlFor="customType">Custom Type Name</Label>
            <Input
              id="customType"
              name="customType"
              defaultValue={isInitialCustom ? initialType : ""}
              placeholder="Name your document type"
              required
            />
          </div>
        )}
      </Section>

      <Section title="When does it expire?" hint="We'll remind you before this date.">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry / end date</Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              defaultValue={initialValues?.expiry_date ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue / start date</Label>
            <Input
              id="issueDate"
              name="issueDate"
              type="date"
              defaultValue={initialValues?.issue_date ?? ""}
            />
          </div>
        </div>
      </Section>

      <Section title="More details" hint="Optional">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="docNumber">Document Number</Label>
            <Input id="docNumber" name="docNumber" defaultValue={initialValues?.doc_number ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holderName">Holder Name</Label>
            <Input id="holderName" name="holderName" defaultValue={initialValues?.holder_name ?? ""} />
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
      </Section>

      <div className="pb-safe sticky bottom-24 z-10 md:static">
        <Button type="submit" variant="brand" size="lg" disabled={isPending} className="w-full">
          {isPending ? "Saving…" : "Save document"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={cn("space-y-4 rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5")}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

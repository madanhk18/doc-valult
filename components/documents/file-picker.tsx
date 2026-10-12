"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, FileText, RefreshCw } from "lucide-react";
import { ACCEPTED_FILE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Big tap target for the document file. On iPhone the native sheet offers
 * Take Photo, Photo Library and Files. The real <input name="file"> stays in
 * the form, so the surrounding FormData picks it up unchanged.
 */
export function FilePicker({ name, error }: { name: string; error?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Kept in a ref too, so the unmount cleanup can free the last preview.
  const latestPreview = useRef<string | null>(null);

  function pick(next: File | null) {
    if (latestPreview.current) URL.revokeObjectURL(latestPreview.current);
    const url = next?.type.startsWith("image/") ? URL.createObjectURL(next) : null;
    latestPreview.current = url;
    setFile(next);
    setPreviewUrl(url);
  }

  useEffect(
    () => () => {
      if (latestPreview.current) URL.revokeObjectURL(latestPreview.current);
    },
    []
  );

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (!dropped || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    inputRef.current.files = transfer.files;
    pick(dropped);
  }

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60",
          error && "border-destructive"
        )}
      >
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={previewUrl} alt="" className="max-h-56 rounded-2xl object-contain shadow-md" />
            ) : (
              <span className="grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <FileText className="size-8" />
              </span>
            )}
            <div>
              <p className="max-w-[16rem] truncate text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <RefreshCw className="size-4" />
              Choose a different file
            </span>
          </>
        ) : (
          <>
            <span className="grid size-16 place-items-center rounded-3xl bg-brand text-white shadow-lg">
              <Camera className="size-8" />
            </span>
            <div>
              <p className="font-semibold">Snap or upload your document</p>
              <p className="mt-1 text-sm text-muted-foreground">Photo, image or PDF · up to 10 MB</p>
            </div>
          </>
        )}
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

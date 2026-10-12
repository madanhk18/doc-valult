"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Archive, Download, ExternalLink, Pencil, Share, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { archiveDocument, deleteDocument } from "@/lib/actions/documents";
import { cn } from "@/lib/utils";

const tileClass =
  "flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-xs font-medium transition-colors hover:bg-accent";

function Tile({ icon: Icon, label, color }: { icon: LucideIcon; label: string; color: string }) {
  return (
    <>
      <Icon className="size-5" style={{ color }} />
      {label}
    </>
  );
}

export function DocumentActions({
  id,
  name,
  fileName,
  fileUrl,
  downloadUrl,
}: {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  downloadUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const shareFile = useSharableFile(fileUrl, fileName);

  // Safari only allows share() straight from the tap, so the file is fetched
  // ahead of time and nothing is awaited before calling it.
  function share() {
    if (!shareFile) {
      toast.info("Getting the file ready — try again in a second.");
      return;
    }
    if (!navigator.canShare?.({ files: [shareFile] })) {
      toast.info("Sharing isn't supported in this browser — use Download instead.");
      return;
    }
    navigator.share({ files: [shareFile], title: name }).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Couldn't share this file");
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={tileClass}>
        <Tile icon={ExternalLink} label="Open" color="var(--info)" />
      </a>
      <button type="button" onClick={share} className={tileClass}>
        <Tile icon={Share} label="Share" color="var(--success)" />
      </button>
      <a href={downloadUrl} download className={tileClass}>
        <Tile icon={Download} label="Download" color="var(--primary)" />
      </a>
      <Link href={`/documents/${id}/edit`} className={tileClass}>
        <Tile icon={Pencil} label="Edit" color="var(--warning)" />
      </Link>

      <ConfirmDialog
        trigger={<Tile icon={Archive} label="Archive" color="var(--muted-foreground)" />}
        title="Archive this document?"
        body="It will be hidden from your dashboard and list, and no more reminders are sent for it."
        confirmLabel="Archive"
        pending={isPending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await archiveDocument(id);
            if (result?.error) toast.error(result.error);
          })
        }
      />
      <ConfirmDialog
        trigger={<Tile icon={Trash2} label="Delete" color="var(--destructive)" />}
        title="Delete this document permanently?"
        body="This removes the file and its record. This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={isPending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteDocument(id);
            if (result?.error) toast.error(result.error);
          })
        }
      />
    </div>
  );
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function useSharableFile(fileUrl: string, fileName: string): File | null {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof navigator.canShare !== "function") return;
    let cancelled = false;
    fetch(fileUrl)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
        const type = blob.type || MIME_BY_EXTENSION[extension] || "application/octet-stream";
        setFile(new File([blob], fileName, { type }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fileUrl, fileName]);

  return file;
}

function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<button type="button" className={cn(tileClass)} />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{body}</p>
        <DialogFooter>
          <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

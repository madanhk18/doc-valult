"use client";

import Link from "next/link";
import { useTransition } from "react";
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

export function DocumentActions({
  id,
  fileUrl,
}: {
  id: string;
  fileUrl: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        render={
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            View Full Document
          </a>
        }
      />
      <Button
        variant="outline"
        size="sm"
        render={
          <a href={fileUrl} download>
            Download
          </a>
        }
      />
      <Button variant="outline" size="sm" disabled title="Coming in a later phase">Share</Button>
      <Button variant="outline" size="sm" disabled title="Coming in a later phase">Renew / Replace</Button>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`/documents/${id}/edit`}>Edit Details</Link>}
      />

      <Dialog>
        <DialogTrigger render={<Button variant="outline" size="sm">Archive</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this document?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            It will be hidden from your dashboard and document list. You can restore it later from support if needed.
          </p>
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await archiveDocument(id);
                if (result?.error) toast.error(result.error);
              })}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger render={<Button variant="destructive" size="sm">Delete</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document permanently?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the file and its record. This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await deleteDocument(id);
                if (result?.error) toast.error(result.error);
              })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

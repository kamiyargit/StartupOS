"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExpenseAttachmentDTO } from "@/lib/dto";
import { formatBytes } from "@/lib/format";

type AttachmentViewerProps = {
  attachment: ExpenseAttachmentDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AttachmentViewer({ attachment, open, onOpenChange }: AttachmentViewerProps) {
  if (!attachment) return null;

  const isImage = attachment.mimeType.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-gh-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">{attachment.fileName}</DialogTitle>
              <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
                {formatBytes(attachment.sizeBytes)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 dark:bg-gh-neutral">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="mx-auto max-h-[calc(95dvh-5rem)] w-full object-contain"
            />
          )}
          {isPdf && (
            <iframe
              src={attachment.url}
              title={attachment.fileName}
              className="h-[calc(95dvh-5rem)] w-full border-0"
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="h-12 w-12 text-primary-600" />
              <p className="text-sm text-slate-600 dark:text-gh-fg-muted">
                پیش‌نمایش این نوع فایل در برنامه پشتیبانی نمی‌شود.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={attachment.url} download={attachment.fileName}>
                  دانلود فайل
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type AttachmentGridProps = {
  attachments: ExpenseAttachmentDTO[];
  onRemove?: (id: string) => void;
  removingId?: string | null;
};

export function AttachmentGrid({ attachments, onRemove, removingId }: AttachmentGridProps) {
  const [viewerAttachment, setViewerAttachment] = useState<ExpenseAttachmentDTO | null>(null);

  if (!attachments.length) return null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {attachments.map((a) => (
          <div
            key={a.id}
            className="group overflow-hidden rounded-lg border border-slate-200 dark:border-gh-border"
          >
            <button
              type="button"
              onClick={() => setViewerAttachment(a)}
              className="block w-full text-start transition hover:border-primary-400 dark:hover:border-primary-600"
            >
              {a.mimeType.startsWith("image/") ? (
                <div className="aspect-video bg-slate-100 dark:bg-gh-neutral">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt={a.fileName}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-slate-50 dark:bg-gh-neutral">
                  <FileText className="h-12 w-12 text-primary-600" />
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-gh-border">
                <FileText className="h-4 w-4 shrink-0 text-primary-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.fileName}</p>
                  <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
                    {formatBytes(a.sizeBytes)}
                  </p>
                </div>
              </div>
            </button>
            {onRemove && (
              <div className="border-t border-slate-100 p-2 dark:border-gh-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 dark:text-red-400"
                  disabled={removingId === a.id}
                  onClick={() => onRemove(a.id)}
                >
                  {removingId === a.id ? "در حال حذف..." : "حذف پیوست"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <AttachmentViewer
        attachment={viewerAttachment}
        open={!!viewerAttachment}
        onOpenChange={(o) => !o && setViewerAttachment(null)}
      />
    </>
  );
}

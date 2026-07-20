"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";

export type UploadedFile = {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
};

type FileUploadProps = {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
};

function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ...data, sizeBytes: file.size });
        } else {
          reject(new Error(data.error ?? "خطا در آپلود"));
        }
      } catch {
        reject(new Error("خطا در آپلود"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("خطا در آپلود")));
    xhr.open("POST", "/api/upload");
    xhr.send(form);
  });
}

export function FileUpload({ value, onChange }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setError(null);
      const list = Array.from(files);
      const uploaded: UploadedFile[] = [];

      for (const file of list) {
        setCurrentFile(file.name);
        setProgress(0);
        try {
          const result = await uploadWithProgress(file, setProgress);
          uploaded.push(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : "خطا در آپلود");
        }
      }

      if (uploaded.length) {
        onChange([...value, ...uploaded]);
      }

      setUploading(false);
      setProgress(0);
      setCurrentFile(null);
    },
    [onChange, value],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const remove = (id: string) => {
    onChange(value.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-primary-400 dark:border-gh-border dark:bg-gh-canvas-subtle/50 dark:hover:border-primary-600 sm:p-8",
          uploading && "opacity-80",
        )}
      >
        <Upload className="h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-gh-fg-muted">فایل را بکشید یا انتخاب کنید (تصویر یا PDF)</p>
        <label>
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*,application/pdf"
            disabled={uploading}
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <span>انتخاب فایل</span>
          </Button>
        </label>
      </div>

      {uploading && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-gh-border dark:bg-gh-canvas-subtle">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-slate-600 dark:text-gh-fg-muted">{currentFile}</span>
            <span className="shrink-0 text-primary-700 dark:text-primary-400">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-gh-danger">{error}</p>}

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-gh-border"
            >
              <div className="flex min-w-0 items-center gap-2 text-sm">
                {f.mimeType.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary-600" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-primary-600" />
                )}
                <span className="truncate">{f.fileName}</span>
                {f.sizeBytes !== undefined && (
                  <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.sizeBytes)}</span>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(f.id)}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

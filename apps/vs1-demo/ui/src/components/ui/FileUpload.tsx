import React from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProgressBar } from './Progress';

// ─── FileUpload ─────────────────────────────────────────────────────────────────
// Molecule: a dashed dropzone + a list of selected files. Drag-and-drop or
// click-to-browse, size/accept validation, per-file remove, optional progress.
// Controlled (`value`) or uncontrolled (internal state). Mode-aware tokens →
// light + dark; statics get dark: variants. opacity-on-CSS-var is broken, so
// translucent surfaces use static colors (bg-neutral-50, bg-white/[0.04]).

export interface FileUploadProps {
  /** Native input `accept` attribute (e.g. ".pdf,image/*"). Also used for validation. */
  accept?: string;
  /** Allow selecting more than one file. Default true. */
  multiple?: boolean;
  /** Reject files larger than this many MB. */
  maxSizeMB?: number;
  /** Controlled list of files. Omit to let the component manage state internally. */
  value?: File[];
  /** Notified whenever the file list changes (add or remove). */
  onFilesChange?: (files: File[]) => void;
  /** Optional upload progress per file, keyed by `${name}-${size}` → 0..100. */
  progress?: Record<string, number>;
  disabled?: boolean;
  /** Custom secondary hint line. Defaults to accept + max size summary. */
  hint?: React.ReactNode;
  className?: string;
}

// ─── size formatting ──────────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

const fileKey = (f: File) => `${f.name}-${f.size}`;

// Does a file satisfy the `accept` attribute? (extensions, mime, mime wildcards)
function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export function FileUpload({
  accept,
  multiple = true,
  maxSizeMB,
  value,
  onFilesChange,
  progress,
  disabled = false,
  hint,
  className,
}: FileUploadProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<File[]>([]);
  const files = isControlled ? value! : internal;

  const [dragActive, setDragActive] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = (next: File[]) => {
    if (!isControlled) setInternal(next);
    onFilesChange?.(next);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    const accepted: File[] = [];
    const nextErrors: string[] = [];

    for (const file of list) {
      if (!matchesAccept(file, accept)) {
        nextErrors.push(`${file.name} — file type not allowed.`);
        continue;
      }
      if (maxSizeMB != null && file.size > maxSizeMB * 1024 * 1024) {
        nextErrors.push(`${file.name} — exceeds ${maxSizeMB} MB limit.`);
        continue;
      }
      accepted.push(file);
    }

    setErrors(nextErrors);
    if (accepted.length === 0) return;

    if (multiple) {
      // de-dupe against current selection by name+size
      const seen = new Set(files.map(fileKey));
      const merged = [...files, ...accepted.filter((f) => !seen.has(fileKey(f)))];
      commit(merged);
    } else {
      commit([accepted[0]]);
    }
  };

  const removeFile = (target: File) => {
    commit(files.filter((f) => f !== target));
  };

  const openBrowse = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const defaultHint = (
    <>
      {accept ? accept : 'Any file type'}
      {maxSizeMB != null && ` · up to ${maxSizeMB} MB`}
    </>
  );

  return (
    <div className={cn('w-full', className)}>
      {/* ── Dropzone ── */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={openBrowse}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openBrowse();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40',
          dragActive ? 'border-stroke-brand bg-brand-light' : 'border-stroke bg-surface',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-stroke-strong hover:bg-neutral-50 dark:hover:bg-white/[0.04]',
        )}
      >
        <UploadCloud className="mb-3 h-8 w-8 text-fg-tertiary" aria-hidden />
        <p className="text-[14px] text-fg">
          Drag &amp; drop files here or{' '}
          <span className="font-medium text-fg-brand underline underline-offset-2">browse</span>
        </p>
        <p className="mt-1 text-[12px] text-fg-tertiary">{hint ?? defaultHint}</p>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
      </div>

      {/* ── Validation errors ── */}
      {errors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errors.map((msg, i) => (
            <li key={i} className="text-[12px] text-error-700 dark:text-red-400">
              {msg}
            </li>
          ))}
        </ul>
      )}

      {/* ── File list ── */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file) => {
            const pct = progress?.[fileKey(file)];
            return (
              <li
                key={fileKey(file)}
                className="flex items-center gap-3 rounded-lg border border-stroke bg-surface p-3"
              >
                <FileIcon className="h-5 w-5 shrink-0 text-fg-tertiary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] text-fg">{file.name}</span>
                    <span className="ml-auto shrink-0 text-[12px] text-fg-tertiary">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  {pct != null && <ProgressBar value={pct} size="sm" className="mt-2" />}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    aria-label={`Remove ${file.name}`}
                    className="shrink-0 rounded-md p-1 text-fg-tertiary transition-colors hover:bg-neutral-100 hover:text-fg dark:hover:bg-white/10"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
FileUpload.displayName = 'FileUpload';

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const CONTROL_CLASSES =
  "w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-sans text-sm text-ink-900 " +
  "placeholder:text-ink-500/60 transition-colors duration-200 " +
  "focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "aria-[invalid=true]:border-blush-500 aria-[invalid=true]:ring-blush-500/20";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block font-sans text-xs font-medium uppercase tracking-[0.14em] text-ink-700"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-blush-500">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL_CLASSES, className)} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CONTROL_CLASSES, "resize-none", className)} />;
}

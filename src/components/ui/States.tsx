import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn("size-5 animate-spin text-olive-600", className)}
    />
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500"
    >
      <Spinner />
      <p className="font-sans text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-cream-300 bg-cream-50/60 px-6 py-14 text-center">
      {icon && <div className="text-sage-400">{icon}</div>}
      <h3 className="font-serif text-xl text-ink-900">{title}</h3>
      {description && <p className="max-w-sm font-sans text-sm text-ink-500">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Algo salió mal",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-blush-300 bg-blush-200/40 px-6 py-12 text-center"
    >
      <h3 className="font-serif text-xl text-ink-900">{title}</h3>
      {description && <p className="max-w-sm font-sans text-sm text-ink-700">{description}</p>}
      {action}
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { InvitationStatusValue } from "@/lib/validations";

const STATUS_STYLES: Record<InvitationStatusValue, string> = {
  CONFIRMED: "bg-olive-600/12 text-olive-700 border-olive-600/25",
  PENDING: "bg-gold-500/12 text-gold-600 border-gold-500/30",
  DECLINED: "bg-blush-500/12 text-blush-500 border-blush-500/25",
};

export const STATUS_LABELS: Record<InvitationStatusValue, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  DECLINED: "No asistirá",
};

export function StatusBadge({
  status,
  className,
}: {
  status: InvitationStatusValue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium tracking-wide",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

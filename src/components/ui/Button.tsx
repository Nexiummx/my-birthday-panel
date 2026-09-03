import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-olive-600 text-cream-50 hover:bg-olive-700 active:bg-olive-700 shadow-sm shadow-olive-700/20",
  secondary:
    "bg-cream-100 text-ink-900 border border-cream-300 hover:bg-cream-200 hover:border-gold-400",
  ghost: "text-ink-700 hover:bg-cream-100 hover:text-ink-900",
  danger: "bg-blush-500 text-cream-50 hover:bg-blush-400",
  gold: "bg-gold-500 text-forest-900 hover:bg-gold-400 shadow-sm shadow-gold-600/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-8 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium tracking-wide",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-px active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

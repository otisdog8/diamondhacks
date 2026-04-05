import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** "default" = white primary card, "secondary" = subtle grey card */
  variant?: "default" | "secondary";
}

export function Card({ children, className = "", variant = "default" }: CardProps) {
  const base =
    variant === "secondary"
      ? "bg-[#F0F1F5] dark:bg-[#161820] border border-[#E2E4EC] dark:border-[#2E3347]"
      : "bg-white dark:bg-[#1A1D27] border border-[#EBEBEB] dark:border-[#1E2235] shadow-sm";

  return (
    <div className={`rounded-xl p-6 ${base} ${className}`}>
      {children}
    </div>
  );
}

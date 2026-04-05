"use client";

import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "light" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants: Record<string, string> = {
  /* Blue-500 primary — strong CTA */
  primary:
    "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-sm focus:ring-blue-400",
  /* Teal-accent secondary — supportive actions */
  secondary:
    "bg-[#EBF8FA] hover:bg-[#D5F1F5] active:bg-[#BDE9EE] text-[#1A7F8C] border border-[#60CCD4]/50 focus:ring-[#60CCD4]",
  /* Alias for secondary */
  light:
    "bg-[#EBF8FA] hover:bg-[#D5F1F5] active:bg-[#BDE9EE] text-[#1A7F8C] border border-[#60CCD4]/50 focus:ring-[#60CCD4]",
  /* Danger */
  danger:
    "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white focus:ring-red-400",
  /* Ghost — tertiary / text-button */
  ghost:
    "hover:bg-[#F0F1F5] active:bg-[#E5E6EC] text-[#464646] dark:text-[#C8C8C8] dark:hover:bg-[#22263A] focus:ring-[#D3D3D3]",
};

const sizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-2.5 text-base rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

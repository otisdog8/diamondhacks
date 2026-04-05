"use client";

import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[#464646] dark:text-[#C8C8C8]">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-lg border bg-white dark:bg-[#1A1D27] px-3 py-2 text-sm
          text-[#000000] dark:text-[#F5F6F8]
          placeholder-[#C8C8C8] dark:placeholder-[#464646]
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
          transition-colors
          ${error
            ? "border-red-400 dark:border-red-500"
            : "border-[#D3D3D3] dark:border-[#2E3347] focus:border-blue-500 dark:focus:border-blue-400"
          }
          ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

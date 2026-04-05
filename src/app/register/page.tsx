"use client";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500 text-[12px] font-bold text-white">
              i
            </span>
            <span className="text-2xl font-bold text-[#000000] dark:text-[#F5F6F8] tracking-tight">
              inBtwn
            </span>
          </Link>
          <p className="mt-3 text-[#8F8F8F] dark:text-[#8F8F8F]">
            Create your account
          </p>
        </div>
        <Card>
          <RegisterForm />
        </Card>
      </div>
    </div>
  );
}

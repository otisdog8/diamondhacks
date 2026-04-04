"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
            CanvasCal
          </Link>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </div>
  );
}

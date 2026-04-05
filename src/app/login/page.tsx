"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              <span style={{ color: "#5B6CFF" }}>in</span>
              <span className="text-gray-900 dark:text-white">btwn</span>
            </span>
          </Link>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">
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

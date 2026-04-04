"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/dashboard";
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            CanvasCal
          </h1>
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
            Import your Canvas class schedule to Google Calendar automatically
            using AI-powered browser automation.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">1. Connect Canvas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Log into Canvas through a secure browser session
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">2. Import Classes</h3>
            <p className="mt-1 text-sm text-gray-500">
              AI extracts your full schedule, including external links
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">3. Export to Calendar</h3>
            <p className="mt-1 text-sm text-gray-500">
              Automatically create recurring events in Google Calendar
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

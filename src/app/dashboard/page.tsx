"use client";

import { ClassList } from "@/components/dashboard/ClassList";
import { CrawlExternalUrl } from "@/components/dashboard/CrawlExternalUrl";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Classes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your imported class schedule
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/canvas">
            <Button>Import from Canvas</Button>
          </Link>
          <Link href="/calendar">
            <Button variant="secondary">Export to Calendar</Button>
          </Link>
        </div>
      </div>
      <CrawlExternalUrl />
      <ClassList />
    </div>
  );
}

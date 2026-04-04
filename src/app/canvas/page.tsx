"use client";

import { ConnectionWizard } from "@/components/canvas/ConnectionWizard";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function CanvasPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <ConnectionWizard />
    </div>
  );
}

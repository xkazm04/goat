"use client";

import { CreatorAnalyticsDashboard } from "@/app/features/Analytics";
import { useAuthUser } from "@/hooks/use-auth-user";

export default function AnalyticsPage() {
  const { userId, isLoading } = useAuthUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-brand-hover border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Sign in to view your creator analytics.
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <CreatorAnalyticsDashboard userId={userId} />
    </main>
  );
}

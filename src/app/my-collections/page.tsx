"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CollectionsDashboard } from "@/app/features/Collections";

// useSearchParams needs a Suspense boundary above it; the same shape the
// (match)/goat page uses. The landing page links here with ?selected=<id>.
function MyCollectionsContent() {
  const searchParams = useSearchParams();
  return <CollectionsDashboard initialSelectedId={searchParams.get("selected")} />;
}

export default function MyCollectionsPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Suspense fallback={null}>
        <MyCollectionsContent />
      </Suspense>
    </main>
  );
}

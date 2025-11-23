import { AwardList } from "@/app/features/Awards/AwardList";
import { Suspense } from "react";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AwardPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const listId = typeof params.id === 'string' ? params.id : '';

    if (!listId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">No Award List Selected</h1>
                    <p className="text-gray-400">Please select an award list from the home page.</p>
                </div>
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050505]" />}>
            <AwardList parentListId={listId} />
        </Suspense>
    );
}

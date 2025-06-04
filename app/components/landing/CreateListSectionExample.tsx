'use client';

import { useState } from 'react';
import { CompositionModal } from '@/app/features/Landing/CompositionModal';
import { useTempUser } from '@/app/hooks/use-temp-user';
import { CompositionResult } from '@/app/types/composition-to-api';

export function CreateListSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { tempUserId, isTempUser } = useTempUser();

  const handleSuccess = (result: CompositionResult) => {
    console.log('List creation result:', result);
    
    if (result.success && result.redirectUrl) {
      // Additional success handling if needed
      console.log('Redirecting to:', result.redirectUrl);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform"
      >
        Create Your Top List
      </button>
      
      {isTempUser && tempUserId && (
        <p className="text-sm text-gray-400">
          Creating as guest user • <span className="text-xs">{tempUserId.slice(-8)}</span>
        </p>
      )}

      <CompositionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
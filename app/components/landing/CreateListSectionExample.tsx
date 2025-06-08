'use client';

import { useState } from 'react';
import { CompositionModal } from '@/app/features/Landing/CompositionModal';
import { ListSelectionModal } from './ListSelectionModal';
import { useTempUser } from '@/app/hooks/use-temp-user';
import { CompositionResult } from '@/app/types/composition-to-api';

export function CreateListSection() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const { tempUserId, isTempUser } = useTempUser();

  const handleSuccess = (result: CompositionResult) => {
    console.log('List creation result:', result);
    
    if (result.success && result.redirectUrl) {
      console.log('Redirecting to:', result.redirectUrl);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform shadow-lg"
        >
          Create New List
        </button>
        
        <div className="text-slate-400 font-medium">or</div>
        
        <button
          onClick={() => setIsSelectModalOpen(true)}
          className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold border border-slate-600 hover:border-slate-500 transition-all"
        >
          Continue Existing List
        </button>
      </div>
      
      {/* User Info */}
      {isTempUser && tempUserId && (
        <p className="text-sm text-gray-400">
          Creating as guest user • <span className="text-xs">{tempUserId.slice(-8)}</span>
        </p>
      )}

      {/* Create Modal */}
      <CompositionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Select Modal */}
      <ListSelectionModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
      />
    </div>
  );
}
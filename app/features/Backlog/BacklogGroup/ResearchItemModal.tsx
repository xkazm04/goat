"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useItemResearchFlow } from "@/app/hooks/use-item-research";
import { topItemsApi } from "@/app/lib/api/top-items";
import { AddItemHeader } from "@/app/components/modals/addItem/AddItemHeader";
import { AddItemContent } from "@/app/components/modals/addItem/AddItemContent";
import { AddItemActions } from "@/app/components/modals/addItem/AddItemActions";

interface ResearchItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (researchedItem: any) => void;
  groupTitle: string;
  category: string;
  subcategory: string;
}

export function ResearchItemModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  groupTitle, 
  category, 
  subcategory 
}: ResearchItemModalProps) {
  const [itemName, setItemName] = useState("");
  const [step, setStep] = useState<'input' | 'validating' | 'results' | 'creating'>('input');
  
  const {
    validationResult,
    researchItem,
    researchResult,
    isLoading,
    resetAll
  } = useItemResearchFlow();

  const handleValidate = async () => {
    if (!itemName.trim()) return;
    
    setStep('validating');
    
    try {
      await researchItem({
        name: itemName.trim(),
        category,
        subcategory,
        research_depth: 'standard',
        allow_duplicate: false,
        auto_create: false
      });
      
      setStep('results');
    } catch (err) {
      console.error('Research failed:', err);
      setStep('results');
    }
  };

  const handleAddItem = async () => {
    if (!researchResult) return;
    
    setStep('creating');
    
    try {
      let itemData = researchResult;
      
      if (!researchResult.item_created && researchResult.is_valid) {
        const newItem = await topItemsApi.createItem({
          name: researchResult.name,
          description: researchResult.description || '',
          category: researchResult.category as any,
          subcategory: researchResult.subcategory,
          item_year: researchResult.item_year,
          item_year_to: researchResult.item_year_to,
          image_url: researchResult.image_url,
          group: researchResult.group,
        });
        
        itemData = { ...researchResult, item_created: true, item_id: newItem.id };
      }
      
      await onConfirm(itemData);
      handleClose();
    } catch (err) {
      console.error('Failed to create item:', err);
      setStep('results');
    }
  };

  const handleClose = () => {
    setItemName("");
    setStep('input');
    resetAll();
    onClose();
  };

  const handleTryAgain = () => {
    setStep('input');
    resetAll();
  };

  const getCurrentResult = () => researchResult || validationResult;
  const currentResult = getCurrentResult();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-2xl border-2 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, 
                    rgba(15, 23, 42, 0.98) 0%,
                    rgba(30, 41, 59, 0.98) 50%,
                    rgba(51, 65, 85, 0.98) 100%
                  )`,
                  border: '2px solid rgba(71, 85, 105, 0.4)',
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(148, 163, 184, 0.1)
                  `
                }}
              >
                <AddItemHeader
                  groupTitle={groupTitle}
                  category={category}
                  subcategory={subcategory}
                  step={step}
                  onClose={handleClose}
                />

                <AddItemContent
                  step={step}
                  itemName={itemName}
                  setItemName={setItemName}
                  currentResult={currentResult}
                  onValidate={handleValidate}
                />

                <AddItemActions
                  step={step}
                  itemName={itemName}
                  isLoading={isLoading}
                  currentResult={currentResult}
                  onValidate={handleValidate}
                  onTryAgain={handleTryAgain}
                  onAddItem={handleAddItem}
                  onClose={handleClose}
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
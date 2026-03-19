"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Flame,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback, memo } from 'react';


import { DURATION } from '@/lib/animations/motion-presets';
import { getControversyLevel, getControversyLabel } from '@/lib/debate/types';

import type { DebateThread, DebateMessage } from '@/lib/debate/types';

interface DebatePanelProps {
  thread: DebateThread | null;
  onReply: (content: string) => void;
  onAccept: () => void;
  onDismiss: () => void;
  onClose: () => void;
  isLoading: boolean;
}

/**
 * Chat-like panel for debating item placements with the AI.
 * Slides in from the right side of the tier list.
 */
export const DebatePanel = memo(function DebatePanel({
  thread,
  onReply,
  onAccept,
  onDismiss,
  onClose,
  isLoading,
}: DebatePanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages.length]);

  // Focus input when thread becomes active
  useEffect(() => {
    if (thread?.status === 'active') {
      inputRef.current?.focus();
    }
  }, [thread?.status]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onReply(trimmed);
    setInput('');
  }, [input, isLoading, onReply]);

  if (!thread) return null;

  const level = getControversyLevel(thread.controversyScore);
  const label = getControversyLabel(level);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-96 z-sticky flex flex-col
          bg-slate-900/98 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Debate</h3>
                <p className="text-xs text-slate-400">Ranking Advisor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
              aria-label="Close debate panel"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Item context */}
          <div className="flex items-center gap-2 p-2 rounded-card bg-slate-800/80">
            <span className="text-sm font-medium text-white truncate">
              {thread.itemName}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-sm font-bold text-brand shrink-0">
              Tier {thread.tier}
            </span>
            {thread.controversyScore > 0 && (
              <span className={`
                ml-auto text-2xs font-bold uppercase px-1.5 py-0.5 rounded-badge
                ${level === 'volcanic' || level === 'hot' ? 'bg-red-500/20 text-red-400' :
                  level === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'}
              `}>
                {label}
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {thread.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-brand" />
              </div>
              <div className="bg-slate-800/80 rounded-container rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Key facts */}
          {thread.messages.length > 0 && !isLoading && thread.status === 'active' && (
            <KeyFactsSection thread={thread} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick responses */}
        {thread.status === 'active' && !isLoading && thread.messages.length > 0 && (
          <div className="shrink-0 px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <QuickReply onClick={() => onReply("I disagree, here's why...")} label="Push back" icon={ThumbsDown} />
              <QuickReply onClick={() => onReply("Good point, but consider...")} label="Concede" icon={ThumbsUp} />
              <QuickReply onClick={() => onReply("What about compared to the others?")} label="Compare" icon={MessageCircle} />
            </div>
          </div>
        )}

        {/* Input area */}
        {thread.status !== 'resolved' && (
          <div className="shrink-0 p-4 border-t border-slate-700/60">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Make your case..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-container bg-slate-800 border border-slate-600/60
                  text-sm text-white placeholder-slate-500
                  focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30
                  disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-container bg-brand hover:bg-brand-hover
                  flex items-center justify-center transition-colors
                  disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Send reply"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>

            {/* Resolution buttons */}
            {thread.messages.length >= 2 && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onAccept}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-card
                    bg-green-500/15 text-green-400 text-xs font-medium
                    hover:bg-green-500/25 transition-colors border border-green-500/20 rounded-card"
                >
                  <ThumbsUp className="w-3 h-3" />
                  Accept suggestion
                </button>
                <button
                  onClick={onDismiss}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-card
                    bg-slate-700/50 text-slate-400 text-xs font-medium
                    hover:bg-slate-700/80 transition-colors border border-slate-600/30"
                >
                  <ThumbsDown className="w-3 h-3" />
                  Keep my ranking
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resolved state */}
        {thread.status === 'resolved' && (
          <div className="shrink-0 p-4 border-t border-slate-700/60 text-center">
            <p className="text-sm text-slate-400">
              {thread.resolution === 'accepted' ? (
                <>Suggestion accepted <ThumbsUp className="inline w-3 h-3 ml-1" /></>
              ) : thread.resolution === 'dismissed' ? (
                <>Ranking kept as is <Flame className="inline w-3 h-3 ml-1" /></>
              ) : (
                <>Debate concluded <MessageCircle className="inline w-3 h-3 ml-1" /></>
              )}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Individual message bubble
 */
const MessageBubble = memo(function MessageBubble({ message }: { message: DebateMessage }) {
  const isAI = message.role === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2 ${isAI ? '' : 'flex-row-reverse'}`}
    >
      {isAI && (
        <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-brand" />
        </div>
      )}
      <div
        className={`
          max-w-[85%] rounded-container px-4 py-2.5 text-sm leading-relaxed
          ${isAI
            ? 'bg-slate-800/80 text-slate-200 rounded-tl-sm'
            : 'bg-brand/20 text-white rounded-tr-sm ml-auto'
          }
        `}
      >
        {message.content}
      </div>
    </motion.div>
  );
});

/**
 * Key facts section shown after AI's first argument
 */
function KeyFactsSection({ thread }: { thread: DebateThread }) {
  // Find the last AI message that might have key facts
  const lastAIMsg = [...thread.messages].reverse().find(m => m.role === 'ai');
  if (!lastAIMsg) return null;

  // Key facts are stored in the thread via the response
  // We show challenge strength as a visual indicator
  if (thread.challengeStrength < 10) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mx-8 p-2.5 rounded-card bg-slate-800/40 border border-slate-700/30"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Flame className="w-3 h-3 text-amber-400" />
        <span className="text-2xs font-bold text-amber-400 uppercase tracking-wider">
          Challenge Strength
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${thread.challengeStrength}%` }}
          transition={{ duration: DURATION.dramatic, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            thread.challengeStrength > 70 ? 'bg-red-500' :
            thread.challengeStrength > 40 ? 'bg-amber-500' :
            'bg-green-500'
          }`}
        />
      </div>
      <p className="text-2xs text-slate-500 mt-1">
        {thread.challengeStrength > 70
          ? 'The AI strongly disagrees with this placement'
          : thread.challengeStrength > 40
          ? 'The AI has reservations about this placement'
          : 'The AI mostly agrees with this placement'}
      </p>
    </motion.div>
  );
}

/**
 * Quick reply button
 */
function QuickReply({
  onClick,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-badge
        bg-slate-800/80 text-slate-400 text-xs font-medium
        hover:bg-slate-700 hover:text-slate-300 transition-colors
        border border-slate-700/50"
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

export default DebatePanel;

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronDown, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback, useRef, useEffect } from 'react';

import { useAuthUser } from '@/hooks/use-auth-user';
import { DURATION } from '@/lib/animations/motion-presets';

/**
 * Avatar dropdown with sign-out for authenticated users.
 *
 * Displays user avatar (from Google profile) or fallback initial.
 * Simple dropdown on click with "Sign out" option.
 */
export function UserMenu() {
  const { user, signOut } = useAuthUser();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user?.user_metadata?.full_name as string) ||
    user?.email ||
    'User';
  const initial = displayName.charAt(0).toUpperCase();

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsOpen(false);
    await signOut();
  }, [signOut]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center gap-2 p-1.5 rounded-container hover:bg-slate-700/50 transition-colors focus-ring-inset"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
        data-testid="auth-user-menu-btn"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full border border-slate-600/50"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center text-sm font-bold text-white border border-slate-600/50">
            {initial}
          </div>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: DURATION.quick, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-56 rounded-container overflow-hidden z-dropdown"
            style={{
              background: 'rgba(15, 23, 42, 0.97)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              boxShadow: '0 12px 40px -8px rgba(0, 0, 0, 0.6)',
            }}
            role="menu"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-700/50">
              <p className="text-sm font-medium text-white truncate">
                {displayName}
              </p>
              {user?.email && (
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {user.email}
                </p>
              )}
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              <Link
                href="/analytics"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-card text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus-ring-inset"
                role="menuitem"
                data-testid="auth-analytics-link"
              >
                <BarChart3 className="w-4 h-4" />
                Creator Analytics
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-card text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus-ring-inset"
                role="menuitem"
                data-testid="auth-sign-out-btn"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

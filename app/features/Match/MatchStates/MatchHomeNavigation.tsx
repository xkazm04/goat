"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Home, User, LogOut, Twitter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

export function MatchHomeNavigation() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const { openSignIn, signOut } = useClerk();
  const [isHovered, setIsHovered] = useState(false);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleAuthAction = () => {
    if (isSignedIn) {
      signOut(() => router.push('/'));
    } else {
      openSignIn({
        redirectUrl: window.location.href,
        appearance: {
          elements: {
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
            card: 'bg-slate-800 border border-slate-600',
            headerTitle: 'text-white',
            headerSubtitle: 'text-slate-300',
            socialButtonsBlockButton: 'border-slate-600 hover:bg-slate-700',
            socialButtonsBlockButtonText: 'text-slate-300',
            formFieldLabel: 'text-slate-300',
            formFieldInput: 'bg-slate-700 border-slate-600 text-white',
            footerActionText: 'text-slate-400',
            footerActionLink: 'text-blue-400 hover:text-blue-300',
          },
        },
      });
    }
  };

  // Get display text and icon
  const getAuthDisplay = () => {
    if (!isLoaded) {
      return { text: 'Loading...', icon: User };
    }
    
    if (isSignedIn && user) {
      // Extract username or use first name, fallback to email
      const displayName = 
        user.username || 
        user.firstName || 
        user.emailAddresses[0]?.emailAddress?.split('@')[0] || 
        'User';
      
      return { 
        text: displayName.length > 12 ? `${displayName.slice(0, 12)}...` : displayName, 
        icon: User 
      };
    }
    
    return { text: 'Sign', icon: Twitter };
  };

  const { text: authText, icon: AuthIcon } = getAuthDisplay();

  return (
    <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        className="relative pt-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {/* Horizontal Menu Container */}
        <motion.div
          className="relative flex items-center justify-center"
          animate={{
            width: isHovered ? 'auto' : '150px', 
          }}
          transition={{ 
            duration: 0.4,
            ease: [0.25, 0.8, 0.5, 1] 
          }}
        >
          {/* Background Container */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-slate-800/90 via-slate-850/90 to-slate-800/90 backdrop-blur-sm rounded-b-2xl border-x border-b border-slate-600/50 shadow-lg"
            animate={{
              scaleX: isHovered ? 1 : 0.5,
              backgroundColor: isHovered 
                ? "rgba(30, 41, 59, 0.95)" 
                : "rgba(51, 65, 85, 0.90)"
            }}
            transition={{ 
              duration: 0.4,
              ease: [0.25, 0.8, 0.5, 1]
            }}
          />

          {/* Menu Content */}
          <div className="relative flex items-center">
            {/* Home Button - Slides in from left */}
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  initial={{ 
                    opacity: 0, 
                    x: -20, 
                    scale: 0.8 
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1 
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: -20, 
                    scale: 0.8 
                  }}
                  transition={{ 
                    duration: 0.3,
                    delay: 0.1,
                    ease: "easeOut"
                  }}
                  onClick={handleGoHome}
                  className="group relative flex items-center gap-2 px-4 py-3 text-slate-300 hover:text-white transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Home className="w-4 h-4" />
                  <span className="text-sm font-medium">Home</span>
                  
                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r rounded-b-2xl from-blue-600/20 to-blue-400/20 opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Central Chevron Button - Stays in place */}
            <motion.button
              className="relative p-3 text-slate-300 hover:text-white transition-colors duration-200 z-10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ 
                  rotate: isHovered ? 180 : 0
                }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeInOut"
                }}
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </motion.button>

            {/* Auth Button - Slides in from right */}
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  initial={{ 
                    opacity: 0, 
                    x: 20, 
                    scale: 0.8 
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1 
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: 20, 
                    scale: 0.8 
                  }}
                  transition={{ 
                    duration: 0.3,
                    delay: 0.1,
                    ease: "easeOut"
                  }}
                  onClick={handleAuthAction}
                  disabled={!isLoaded}
                  className={`group relative flex items-center gap-2 px-4 py-3 transition-colors duration-200 ${
                    isSignedIn 
                      ? 'text-slate-300 hover:text-green-400' 
                      : 'text-slate-300 hover:text-blue-400'
                  } ${!isLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                  whileHover={{ scale: isLoaded ? 1.05 : 1 }}
                  whileTap={{ scale: isLoaded ? 0.95 : 1 }}
                >
                  <AuthIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{authText}</span>
                  
                  {/* Show logout icon when signed in and hovered */}
                  <AnimatePresence>
                    {isSignedIn && isHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: -5 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -5 }}
                        transition={{ duration: 0.2 }}
                        className="ml-1"
                      >
                        <LogOut className="w-3 h-3 text-red-400 opacity-70" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Conditional hover glow */}
                  <motion.div
                    className={`absolute inset-0 rounded-b-xl opacity-0 group-hover:opacity-100 ${
                      isSignedIn 
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-400/20'
                        : 'bg-gradient-to-r from-blue-500/20 to-sky-400/20'
                    }`}
                    transition={{ duration: 0.2 }}
                  />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* User Status Indicator */}
          <AnimatePresence>
            {isHovered && isLoaded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.2, duration: 0.2 }}
                className="absolute -bottom-2 right-2"
              >
                <div className={`w-2 h-2 rounded-full ${
                  isSignedIn ? 'bg-green-400' : 'bg-slate-500'
                } ${isSignedIn ? 'animate-pulse' : ''}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
"use client";

import { useUser } from '@clerk/nextjs';
import { useMemo } from 'react';
import { UserInfo } from '@/stores/use-list-store';

export function useClerkUser() {
  const { user, isLoaded, isSignedIn } = useUser();

  const userInfo: UserInfo | null = useMemo(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return null;
    }

    return {
      id: user.id,
      is_temporary: false,
      display_name: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
      email: user.primaryEmailAddress?.emailAddress,
      username: user.username || undefined
    };
  }, [user, isLoaded, isSignedIn]);

  return {
    user: userInfo,
    clerkUser: user,
    isLoaded,
    isSignedIn
  };
}
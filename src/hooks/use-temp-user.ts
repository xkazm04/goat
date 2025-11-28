'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TEMP_USER_KEY = 'temp_user_id';
const TEMP_USER_FLAG_KEY = 'is_temp_user'; // Track if user is temporary

export function useTempUser() {
  const [tempUserId, setTempUserId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTempUser, setIsTempUser] = useState(true);

  useEffect(() => {
    // Get or create temp user ID
    let storedId = localStorage.getItem(TEMP_USER_KEY);
    let isTempFlag = localStorage.getItem(TEMP_USER_FLAG_KEY);
    
    if (!storedId) {
      // Create new temp user ID (pure UUID)
      storedId = uuidv4(); // No prefix - valid UUID
      localStorage.setItem(TEMP_USER_KEY, storedId);
      localStorage.setItem(TEMP_USER_FLAG_KEY, 'true');
      setIsTempUser(true);
    } else {
      // Check if this is a temp user or real user
      setIsTempUser(isTempFlag === 'true');
    }
    
    setTempUserId(storedId);
    setIsLoaded(true);
  }, []);

  const clearTempUser = () => {
    localStorage.removeItem(TEMP_USER_KEY);
    localStorage.removeItem(TEMP_USER_FLAG_KEY);
    setTempUserId('');
    setIsTempUser(true);
  };

  // Shared implementation for converting temp user to registered user
  // Called when user registers/logs in
  const upgradeToRegisteredUser = (realUserId: string) => {
    const oldTempId = tempUserId;

    localStorage.setItem(TEMP_USER_KEY, realUserId);
    localStorage.setItem(TEMP_USER_FLAG_KEY, 'false');

    setTempUserId(realUserId);
    setIsTempUser(false);

    return oldTempId;
  };

  return {
    tempUserId,
    isLoaded,
    isTempUser,
    clearTempUser,
    // Aliases for backwards compatibility - both call the same implementation
    migrateTempUserToReal: upgradeToRegisteredUser,
    convertToRegisteredUser: upgradeToRegisteredUser,
  };
}
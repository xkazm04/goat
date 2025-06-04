'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TEMP_USER_KEY = 'temp_user_id';
const TEMP_USER_PREFIX = 'temp_';

export function useTempUser() {
  const [tempUserId, setTempUserId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Get or create temp user ID
    let storedId = localStorage.getItem(TEMP_USER_KEY);
    
    if (!storedId) {
      // Create new temp user ID
      storedId = `${TEMP_USER_PREFIX}${uuidv4()}`;
      localStorage.setItem(TEMP_USER_KEY, storedId);
    }
    
    setTempUserId(storedId);
    setIsLoaded(true);
  }, []);

  const clearTempUser = () => {
    localStorage.removeItem(TEMP_USER_KEY);
    setTempUserId('');
  };

  const migrateTempUserToReal = (realUserId: string) => {
    // This would be called when user registers/logs in
    // You could implement backend migration logic here
    const oldTempId = tempUserId;
    clearTempUser();
    return oldTempId;
  };

  return {
    tempUserId,
    isLoaded,
    isTempUser: tempUserId.startsWith(TEMP_USER_PREFIX),
    clearTempUser,
    migrateTempUserToReal,
  };
}
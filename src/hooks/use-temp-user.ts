'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TEMP_USER_KEY = 'temp_user_id';
const TEMP_USER_FLAG_KEY = 'is_temp_user'; // Track if user is temporary

export function useTempUser() {
  const [tempUserId, setTempUserId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTempUser, setIsTempUser] = useState(true);
  // Latched so the upgrade function below keeps ONE identity for the life of
  // the mount: useAuthUser lists it as an effect dependency, and a function
  // minted per render restarts that effect per render.
  const tempUserIdRef = useRef(tempUserId);
  tempUserIdRef.current = tempUserId;

  useEffect(() => {
    // Get or create temp user ID
    let storedId = localStorage.getItem(TEMP_USER_KEY);
    const isTempFlag = localStorage.getItem(TEMP_USER_FLAG_KEY);
    
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

  // Converts the temp user to a registered user. Called by useAuthUser when
  // a Supabase session appears for a browser that was holding a guest UUID.
  const upgradeToRegisteredUser = useCallback((realUserId: string) => {
    const oldTempId = tempUserIdRef.current;

    localStorage.setItem(TEMP_USER_KEY, realUserId);
    localStorage.setItem(TEMP_USER_FLAG_KEY, 'false');

    setTempUserId(realUserId);
    setIsTempUser(false);

    return oldTempId;
  }, []);

  return {
    tempUserId,
    isLoaded,
    isTempUser,
    migrateTempUserToReal: upgradeToRegisteredUser,
  };
}
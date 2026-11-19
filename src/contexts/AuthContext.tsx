import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AuthController,
  type AuthActionResult,
  type AuthStateSnapshot,
  type SupabaseAuthLike,
} from '../utils/authService';
import { getSupabaseClient } from '../utils/supabaseClient';

export interface AuthContextValue extends AuthStateSnapshot {
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthActionResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resetPasswordForEmail: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  clearRecoveryMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const controllerRef = useRef<AuthController | null>(null);
  if (!controllerRef.current) {
    const client = getSupabaseClient();
    const authClient = client ? (client.auth as unknown as SupabaseAuthLike) : null;
    controllerRef.current = new AuthController(authClient);
  }

  const [state, setState] = useState<AuthStateSnapshot>(() => controllerRef.current!.getState());

  useEffect(() => {
    const controller = controllerRef.current!;
    const unsubscribeState = controller.subscribe(setState);
    setState(controller.getState());
    let active = true;
    let disposeInit: (() => void) | undefined;

    void controller.initialize().then((dispose) => {
      if (!active) {
        dispose();
      } else {
        disposeInit = dispose;
        setState(controller.getState());
      }
    });

    return () => {
      active = false;
      unsubscribeState();
      disposeInit?.();
    };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      try {
        return await controllerRef.current!.signUp(email, password, displayName);
      } finally {
        setState(controllerRef.current!.getState());
      }
    },
    []
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      try {
        return await controllerRef.current!.signInWithPassword(email, password);
      } finally {
        setState(controllerRef.current!.getState());
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      return await controllerRef.current!.signOut();
    } finally {
      setState(controllerRef.current!.getState());
    }
  }, []);

  const resetPasswordForEmail = useCallback(
    (email: string) => controllerRef.current!.resetPasswordForEmail(email),
    []
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      try {
        return await controllerRef.current!.updatePassword(newPassword);
      } finally {
        setState(controllerRef.current!.getState());
      }
    },
    []
  );

  const clearRecoveryMode = useCallback(() => {
    controllerRef.current!.clearRecoveryMode();
    setState(controllerRef.current!.getState());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signInWithPassword,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      clearRecoveryMode,
    }),
    [
      state,
      signUp,
      signInWithPassword,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      clearRecoveryMode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.');
  }
  return ctx;
}

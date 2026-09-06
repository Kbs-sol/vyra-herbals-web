'use client';

import React, { createContext, useState, useEffect, useContext, useRef, ReactNode } from "react";
import { supabase } from "@/utils/supabaseClient";
import CookieUtils from "@/utils/cookieUtils";
import type { User as AppUser } from "@/types";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  checkUserExists: (phone: string) => Promise<{ exists: boolean; error?: any }>;
  loginWithPassword: (phone: string, password: string) => Promise<{ error?: any }>;
  sendOtp: (phone: string) => Promise<{ verificationId?: string; error?: any }>;
  verifyOtp: (phone: string, verificationId: string, code: string, password?: string, name?: string) => Promise<{ error?: any }>;
  logout: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Timeout utility to prevent hanging promises
const withTimeout = <T,>(promise: Promise<T>, ms: number, fallbackError: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(fallbackError)), ms))
  ]);
};

// Create a custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  // Track the last user id we resolved a profile for, so periodic TOKEN_REFRESHED
  // events don't trigger another DB roundtrip when the same user is already loaded.
  const loadedProfileForId = useRef<string | null>(null);

  // Only call setUser when the resolved profile actually differs from current state.
  // Without this guard, supabase's periodic TOKEN_REFRESHED events would create a
  // new user object reference every time, which cascades through every consumer
  // that uses `user` as a dependency and causes spurious re-fetches and reloads.
  const setUserIfChanged = (next: AppUser | null) => {
    setUser(prev => {
      if (prev === next) return prev;
      if (!prev || !next) return next;
      if (
        prev.id === next.id &&
        prev.email === next.email &&
        prev.name === next.name &&
        prev.role === next.role
      ) {
        return prev; // identical — keep the same reference
      }
      return next;
    });
  };

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    // 1) Resolve auth IMMEDIATELY with a provisional user built from the session
    //    itself, and mark loading complete. Every gated page (profile, orders,
    //    wishlist, ...) waits on `loading`, so unblocking it here — instead of
    //    after a `users` table round-trip that can be slow or hang — is what
    //    fixes pages bouncing to /login on a direct/cold load.
    setUserIfChanged({
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || '',
      role: 1,
      created_at: (authUser as any).created_at,
    });
    setLoading(false);

    // 2) Enrich with the persisted profile (real name/role) in the background.
    //    Skip the DB roundtrip if we've already loaded this profile this session
    //    — this is hit on every TOKEN_REFRESHED event from supabase.
    if (loadedProfileForId.current === authUser.id) {
      return;
    }
    loadedProfileForId.current = authUser.id;
    try {
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const { data } = await withTimeout(
        Promise.resolve(profilePromise),
        15000,
        "Timeout while fetching user profile"
      ) as any;

      if (data) {
        setUserIfChanged({
          id: authUser.id,
          email: data.email || authUser.email || '',
          name: data.name || authUser.user_metadata?.name || '',
          role: data.role,
          created_at: data.created_at,
        });
      }
    } catch (error) {
      // Non-fatal: the provisional user stays in place and the app remains
      // usable. We only lose the enriched name/role until the next load.
      console.error("Error enriching user profile:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    const applySession = (session: { user?: SupabaseUser | null } | null) => {
      if (session?.user) {
        // Fire-and-forget: fetchUserProfile sets a provisional user + loading
        // synchronously and enriches in the background. We must NOT await other
        // supabase calls inside the onAuthStateChange callback — that can
        // deadlock the auth lock — so the enrichment is intentionally detached.
        void fetchUserProfile(session.user);
      } else {
        loadedProfileForId.current = null;
        setUserIfChanged(null);
        setLoading(false);
      }
    };

    // onAuthStateChange emits an INITIAL_SESSION event once the client has
    // finished restoring any persisted session from storage (carrying the
    // restored session, or null when signed out). We treat that as the single
    // authoritative "auth resolved" signal. This is reliable on a cold/direct
    // page load — unlike racing a bare getSession() against it, which was what
    // made pages require visiting the homepage first before auth "worked".
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log(`[AuthContext] onAuthStateChange event: ${event}. Session exists?`, !!session);

      // Ignore periodic token refreshes for an already-resolved user — no need
      // to re-touch React state on an hourly cadence.
      if (
        event === 'TOKEN_REFRESHED' &&
        session?.user &&
        loadedProfileForId.current === session.user.id
      ) {
        return;
      }

      resolved = true;
      applySession(session);
    });

    // Safety net: if INITIAL_SESSION never arrives (very rare), fall back to an
    // explicit getSession so the UI never hangs on the loading spinner. The
    // `resolved` guard makes this a no-op on the normal path.
    const fallbackTimer = setTimeout(async () => {
      if (!mounted || resolved) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted || resolved) return;
        resolved = true;
        applySession(session);
      } catch (err) {
        console.error("[AuthContext] Fallback getSession error:", err);
        if (mounted && !resolved) {
          resolved = true;
          loadedProfileForId.current = null;
          setUserIfChanged(null);
          setLoading(false);
        }
      }
    }, 3000);

    return () => {
      mounted = false;
      resolved = true;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUserExists = async (phone: string) => {
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return { exists: data.exists };
    } catch (error: any) {
      return { exists: false, error: error.message };
    }
  };

  const loginWithPassword = async (phone: string, password: string) => {
    try {
      const cleanedPhone = phone.replace(/\D/g, '').slice(-10);
      const internalEmail = `${cleanedPhone}@phone.internal`;

      console.log('Initiating Supabase authentication...');
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: internalEmail,
          password: password,
        }),
        15000,
        "Sign in request timed out. Please check your internet connection."
      ) as any;

      console.log('Supabase sign in response:', { data, error });

      if (error) {
        // Look for specific confirmation errors
        if (error.message.includes('Email not confirmed') || error.message.includes('credential')) {
          console.error('Login Error detail:', error);
        }
        throw error;
      }

      if (data?.session?.user || data?.user) {
        const authUser = data.session?.user || data.user;
        console.log('Authentication successful, fetching profile for:', authUser.id);
        await fetchUserProfile(authUser);
      } else {
        console.warn('No session or user returned from Supabase sign in');
        throw new Error("Unable to create user session. Please try again.");
      }

      console.log('Login fully resolved with null error');
      return { error: null };
    } catch (error: any) {
      console.error('Login error caught in AuthContext:', error);
      return { error: error.message };
    }
  };

  const sendOtp = async (phone: string) => {
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return { verificationId: data.verificationId };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const verifyOtp = async (phone: string, verificationId: string, code: string, password?: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, verificationId, code, name, password }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Successfully verified and created/found user
      // Now sign in with the deterministic or newly set credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) throw signInError;

      if (signInData?.session?.user) {
        await fetchUserProfile(signInData.session.user);
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    loadedProfileForId.current = null;
    setUserIfChanged(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkUserExists, loginWithPassword, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

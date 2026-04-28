'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
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

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      // First try to get profile from public.users with an explicit timeout
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      let { data, error } = await withTimeout(
        Promise.resolve(profilePromise),
        15000,
        "Timeout while fetching user profile"
      ) as any;

      if (data) {
        setUser({
          id: authUser.id,
          email: data.email || authUser.email || '',
          name: data.name || authUser.user_metadata?.name || '',
          role: data.role,
          created_at: data.created_at,
        });
      } else {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || '',
          role: 1
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || '',
        role: 1
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[AuthContext] getSession initial check. Session exists?', !!session, 'Error?', error);
        if (!mounted) return;

        if (error) {
          console.error("[AuthContext] Supabase getSession error:", error);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('[AuthContext] getSession found user:', session.user.id);
          await fetchUserProfile(session.user);
        } else {
          console.log('[AuthContext] getSession found no session, setting user to null');
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("[AuthContext] Unexpected error in getSession:", err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Initial check
    getSession();

    // Listen for auth events (e.g., login/logout in this tab or sync events from Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] onAuthStateChange event: ${event}. Session exists?`, !!session);
      if (!mounted) return;
      try {
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("[AuthContext] Auth state change error:", err);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
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
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkUserExists, loginWithPassword, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

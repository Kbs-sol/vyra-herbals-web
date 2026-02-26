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
      // First try to get profile from public.users
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    // Initial check
    getSession();

    // Listen for auth events (e.g., login/logout in this tab or sync events from Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Cross-tab synchronization: re-check session when tab becomes visible/focused
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        getSession();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleFocus);
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', handleFocus);
        window.removeEventListener('focus', handleFocus);
      }
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) throw signInError;

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

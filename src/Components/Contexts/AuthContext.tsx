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
  sendOtp: (phone: string) => Promise<{ verificationId?: string; error?: any }>;
  verifyOtp: (phone: string, verificationId: string, code: string, name?: string) => Promise<{ error?: any }>;
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

  useEffect(() => {
    // Check active session
    const getSession = async () => {
      // 1. Try to get session from memory/localStorage
      let { data: { session } } = await supabase.auth.getSession();

      // 2. If no session, try to recover from cookie
      if (!session) {
        const savedSession = CookieUtils.getCookie('v_auth_session');
        if (savedSession) {
          try {
            const parsedSession = JSON.parse(decodeURIComponent(savedSession));
            if (parsedSession.access_token && parsedSession.refresh_token) {
              const { data, error } = await supabase.auth.setSession({
                access_token: parsedSession.access_token,
                refresh_token: parsedSession.refresh_token
              });
              if (!error && data.session) {
                session = data.session;
              }
            }
          } catch (e) {
            console.error("Failed to parse saved session cookie", e);
            CookieUtils.deleteCookie('v_auth_session');
          }
        }
      }

      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Save session to cookie for 90 days
        const sessionData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token
        };
        CookieUtils.setCookie('v_auth_session', encodeURIComponent(JSON.stringify(sessionData)), 90);
        await fetchUserProfile(session.user);
      } else {
        // Clear cookie on sign out
        if (event === 'SIGNED_OUT') {
          CookieUtils.deleteCookie('v_auth_session');
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const verifyOtp = async (phone: string, verificationId: string, code: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, verificationId, code, name }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Successfully verified and created/found user
      // Now sign in with the deterministic credentials
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
    <AuthContext.Provider value={{ user, loading, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

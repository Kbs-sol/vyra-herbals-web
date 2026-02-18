'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { supabase } from "@/utils/supabaseClient";
import type { User as AppUser } from "@/types";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
        // Clear local storage cart if needed, or let CartContext handle it
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      // First try to get profile from public.users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        setUser({
          id: data.id,
          email: authUser.email || '',
          name: data.name || authUser.user_metadata?.name || '',
          role: data.role,
          created_at: data.created_at,
          // Add other fields as per AppUser type
        });
      } else {
        // Fallback or just set basic info if profile lookup fails (or trigger hasn't run yet)
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || '',
          role: 1
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // FALLBACK: Ensure user state is set even if profile fetch fails
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

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login for:", email);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }

      // Check for config (just existence)
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error("Supabase URL is missing in client env!");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
      } else if (data.user) {
        console.log("Login successful:", data.user.id);
        // Explicitly fetch user profile to update state immediately
        await fetchUserProfile(data.user);
      }

      return { error };
    } catch (err: any) {
      console.error("Login exception:", err);
      // Ensure we return an error object that the UI can display
      return { error: { message: err.message || "An unexpected error occurred" } };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log("Attempting signup for:", email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });
      if (error) console.error("Signup error:", error);
      return { error };
    } catch (err) {
      console.error("Signup exception:", err);
      return { error: err };
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

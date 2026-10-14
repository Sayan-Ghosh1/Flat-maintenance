import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AdminRecord {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminRecord: AdminRecord | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminRecord, setAdminRecord] = useState<AdminRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const verifyAdminInDatabase = async (authUser: User | null): Promise<boolean> => {
    if (!authUser || !isSupabaseConfigured) {
      setAdminRecord(null);
      setIsAdmin(false);
      return false;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('admins')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (queryError) {
        console.error('Error verifying admin authorization:', queryError);
        setAdminRecord(null);
        setIsAdmin(false);
        return false;
      }

      if (data) {
        setAdminRecord(data as AdminRecord);
        setIsAdmin(true);
        return true;
      } else {
        setAdminRecord(null);
        setIsAdmin(false);
        return false;
      }
    } catch (err) {
      console.error('Unexpected error checking admin record:', err);
      setAdminRecord(null);
      setIsAdmin(false);
      return false;
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await verifyAdminInDatabase(currentSession.user);
      } else {
        setAdminRecord(null);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching auth session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await verifyAdminInDatabase(currentSession.user);
        } else {
          setAdminRecord(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase credentials are not configured in environment variables.',
      };
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from authentication.' };
      }

      // Check authorization in `admins` table
      const isAuthorized = await verifyAdminInDatabase(data.user);
      if (!isAuthorized) {
        const authId = data.user.id;
        // Sign out because they are not in the admins table
        await supabase.auth.signOut();
        const unauthorizedMsg = `Access Denied: Your account (${email}) is not listed as an administrator in the 'admins' table. (Auth User ID: ${authId}). Please add this ID to the admins table in Supabase.`;
        setError(unauthorizedMsg);
        return {
          success: false,
          error: unauthorizedMsg,
        };
      }

      setUser(data.user);
      setSession(data.session);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed due to unexpected error.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setAdminRecord(null);
      setIsAdmin(false);
      setError(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminRecord,
        isAdmin,
        loading,
        error,
        signIn,
        signOut,
        checkAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

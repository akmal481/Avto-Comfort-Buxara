import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // Clean up if refresh token is invalid/expired
      if (event === "TOKEN_REFRESHED" && !session) {
        await supabase.auth.signOut();
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Log login event
        if (event === "SIGNED_IN") {
          setTimeout(() => {
            supabase.from("user_activity_log").insert({
              user_id: session.user.id, action: "login", metadata: {},
            }).then(() => {});
            supabase.rpc("touch_last_seen").then(() => {});
          }, 0);
        }
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          if (mounted) await checkAdminRole(session.user.id);
          if (mounted) setIsLoading(false);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    // Then get initial session — handle stale refresh tokens gracefully
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        // Stale/invalid token in localStorage — clear it
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkAdminRole(session.user.id);
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

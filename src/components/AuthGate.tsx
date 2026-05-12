import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BlockedScreen from "./BlockedScreen";

const PUBLIC_ROUTES = ["/auth", "/admin-login"];

const AuthGate = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [blocked, setBlocked] = useState<{ blocked: boolean; reason: string | null } | null>(null);
  const [checking, setChecking] = useState(false);

  const isPublic = PUBLIC_ROUTES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!isLoading && !user && !isPublic) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, isPublic, navigate]);

  // Block check + last_seen update
  useEffect(() => {
    if (!user || isAdmin) {
      setBlocked(null);
      return;
    }
    setChecking(true);
    supabase
      .from("profiles")
      .select("is_blocked, blocked_reason")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.is_blocked) {
          setBlocked({ blocked: true, reason: data.blocked_reason });
        } else {
          setBlocked({ blocked: false, reason: null });
          // Touch last_seen
          supabase.rpc("touch_last_seen").then(() => {});
        }
        setChecking(false);
      });

    // Realtime: react to admin block
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const p = payload.new as any;
          if (p.is_blocked) setBlocked({ blocked: true, reason: p.blocked_reason });
          else setBlocked({ blocked: false, reason: null });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin]);

  if (isLoading || (user && !isAdmin && checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!user && !isPublic) return null;

  if (blocked?.blocked && !isPublic) {
    return <BlockedScreen reason={blocked.reason} />;
  }

  return <>{children}</>;
};

export default AuthGate;

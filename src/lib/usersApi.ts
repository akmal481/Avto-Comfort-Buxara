import { supabase } from "@/integrations/supabase/client";

export interface UserWithStats {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  last_seen_at: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  is_suspicious: boolean;
  cancelled_orders_count: number;
  orders_count: number;
  total_spent: number;
}

export async function fetchUsersWithStats(): Promise<UserWithStats[]> {
  const { data, error } = await supabase.rpc("get_users_with_stats");
  if (error) throw error;
  return (data || []).map((u: any) => ({
    ...u,
    orders_count: Number(u.orders_count || 0),
    total_spent: Number(u.total_spent || 0),
  }));
}

export async function setUserBlocked(userId: string, blocked: boolean, reason?: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_blocked: blocked,
      blocked_at: blocked ? new Date().toISOString() : null,
      blocked_reason: blocked ? (reason || "Admin tomonidan bloklangan") : null,
    })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchUserActivity(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("user_activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchUserOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function broadcastMessage(title: string, message: string) {
  const { data, error } = await supabase.functions.invoke("broadcast-message", {
    body: { title, message },
  });
  if (error) throw error;
  return data;
}

export function isVip(u: UserWithStats): boolean {
  return u.total_spent >= 5_000_000 || u.orders_count >= 10;
}

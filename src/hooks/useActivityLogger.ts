import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "login"
  | "logout"
  | "order_created"
  | "order_cancelled"
  | "cart_add"
  | "favorite_add"
  | "review_added";

export async function logActivity(action: ActivityAction, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_activity_log").insert({
      user_id: user.id,
      action,
      metadata: metadata as any,
    });
  } catch (e) {
    // Silent — non-critical
    console.warn("activity log failed", e);
  }
}

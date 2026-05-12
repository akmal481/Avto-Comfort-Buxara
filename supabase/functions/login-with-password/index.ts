import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizePhone } from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function phoneToEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `user${digits}@avtocomfort.uz`;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60_000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone: rawPhone, password } = await req.json();
    if (!rawPhone || !password || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "Telefon va parol kerak" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const phone = normalizePhone(rawPhone);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check block status by phone
    const { data: blockedProfile } = await admin
      .from("profiles").select("is_blocked").eq("phone", phone).eq("is_blocked", true).maybeSingle();
    if (blockedProfile) {
      return new Response(JSON.stringify({ error: "Akkauntingiz bloklangan. Admin bilan bog'laning." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: check failed attempts in last 5 min
    const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data: recentFails } = await admin
      .from("login_attempts")
      .select("attempted_at, success")
      .eq("phone", phone)
      .gte("attempted_at", sinceIso)
      .order("attempted_at", { ascending: false });

    const recentFailCount = (recentFails ?? []).filter((r) => !r.success).length;
    if (recentFailCount >= MAX_ATTEMPTS) {
      const oldest = recentFails!.filter((r) => !r.success)[MAX_ATTEMPTS - 1];
      const waitSec = Math.ceil((WINDOW_MS - (Date.now() - new Date(oldest.attempted_at).getTime())) / 1000);
      return new Response(JSON.stringify({
        error: `Juda ko'p urinish. ${Math.max(1, Math.ceil(waitSec / 60))} daqiqadan so'ng urinib ko'ring.`,
        locked: true,
        retry_after: waitSec,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = phoneToEmail(phone);
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: signin, error: signErr } = await anon.auth.signInWithPassword({ email, password });

    if (signErr || !signin.session) {
      await admin.from("login_attempts").insert({ phone, success: false });
      return new Response(JSON.stringify({ error: "Telefon yoki parol noto'g'ri" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("login_attempts").insert({ phone, success: true });

    return new Response(JSON.stringify({
      success: true,
      access_token: signin.session.access_token,
      refresh_token: signin.session.refresh_token,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("login-with-password error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

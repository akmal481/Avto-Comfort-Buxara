import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { tg, normalizePhone } from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_USERNAME = "avto_comfort_buxara_bot";

async function hashCode(code: string, phone: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${phone}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone: rawPhone, name } = await req.json();
    if (!rawPhone || typeof rawPhone !== "string") {
      return new Response(JSON.stringify({ error: "Telefon raqam kerak" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const phone = normalizePhone(rawPhone);
    if (phone.length < 10) {
      return new Response(JSON.stringify({ error: "Telefon raqam noto'g'ri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: max 1 per 60s, max 5 per hour
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { data: recent } = await supabase
      .from("otp_rate_limits")
      .select("sent_at")
      .eq("phone", phone)
      .gte("sent_at", oneHourAgo)
      .order("sent_at", { ascending: false });

    if (recent && recent.length > 0) {
      if (recent[0].sent_at > oneMinAgo) {
        const wait = 60 - Math.floor((Date.now() - new Date(recent[0].sent_at).getTime()) / 1000);
        return new Response(JSON.stringify({ error: `Kutib turing: ${wait}s` }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (recent.length >= 5) {
        return new Response(JSON.stringify({ error: "Juda ko'p urinish. 1 soat keyin urinib ko'ring." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Block check: by phone via profiles
    const { data: blockedProfile } = await supabase
      .from("profiles").select("is_blocked").eq("phone", phone).eq("is_blocked", true).maybeSingle();
    if (blockedProfile) {
      return new Response(JSON.stringify({ error: "Akkauntingiz bloklangan. Admin bilan bog'laning." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Telegram link
    const { data: tgUser } = await supabase
      .from("telegram_users").select("telegram_chat_id").eq("phone", phone).maybeSingle();

    if (!tgUser) {
      // User must connect bot first
      return new Response(JSON.stringify({
        needs_telegram: true,
        bot_url: `https://t.me/${BOT_USERNAME}?start=${phone.replace("+", "")}`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await hashCode(code, phone);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    // Invalidate old codes
    await supabase.from("otp_codes").update({ consumed: true }).eq("phone", phone).eq("consumed", false);

    // Insert new code
    await supabase.from("otp_codes").insert({ phone, code_hash: codeHash, expires_at: expiresAt });
    await supabase.from("otp_rate_limits").insert({ phone });

    // Send via Telegram
    await tg("sendMessage", {
      chat_id: tgUser.telegram_chat_id,
      text: `🔐 *Avto Comfort Buxara*\n\nSizning tasdiqlash kodingiz:\n\n\`${code}\`\n\n⏱ 5 minut amal qiladi. Hech kim bilan ulashmang!`,
      parse_mode: "Markdown",
    });

    // Save name in passing for later signup
    return new Response(JSON.stringify({ success: true, phone, name: name ?? null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-otp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

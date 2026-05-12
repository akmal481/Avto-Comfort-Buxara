import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { tg } from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    if (!title || !message) {
      return new Response(JSON.stringify({ error: "title va message kerak" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: tgUsers } = await admin.from("telegram_users").select("telegram_chat_id, phone");
    const recipients = tgUsers || [];

    let sent = 0;
    const text = `📣 *${title}*\n\n${message}`;
    for (const u of recipients) {
      try {
        await tg("sendMessage", { chat_id: u.telegram_chat_id, text, parse_mode: "Markdown" });
        sent++;
      } catch (e) {
        console.warn("broadcast send failed for", u.phone, e);
      }
    }

    await admin.from("admin_broadcasts").insert({
      title, message, sent_by: user.id, recipients_count: sent,
    });

    return new Response(JSON.stringify({ success: true, sent, total: recipients.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("broadcast-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

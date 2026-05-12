import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return jsonErr("Avtorizatsiya kerak", 401);

    const { current_password, new_password } = await req.json();
    if (!current_password || !new_password) return jsonErr("Parollar kerak", 400);
    if (typeof new_password !== "string" || new_password.length < 6 || new_password.length > 72) {
      return jsonErr("Yangi parol noto'g'ri formatda", 400);
    }

    // Resolve user from caller token
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user?.email) return jsonErr("Foydalanuvchi topilmadi", 401);

    // Verify current password
    const verifier = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { error: vErr } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });
    if (vErr) return jsonErr("Eski parol noto'g'ri", 400);

    // Update via admin
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: upErr } = await admin.auth.admin.updateUserById(user.id, { password: new_password });
    if (upErr) throw upErr;

    await admin.from("profiles").update({ password_set: true }).eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("change-password error:", e);
    return jsonErr(e instanceof Error ? e.message : "Server error", 500);
  }
});

function jsonErr(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

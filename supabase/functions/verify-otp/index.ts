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

async function hashCode(code: string, phone: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${phone}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone: rawPhone, code, name, password: userPassword } = await req.json();
    if (!rawPhone || !code) {
      return new Response(JSON.stringify({ error: "Telefon va kod kerak" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // If password supplied, validate basic constraints (server-side check)
    if (userPassword !== undefined) {
      if (typeof userPassword !== "string" || userPassword.length < 6 || userPassword.length > 72) {
        return new Response(JSON.stringify({ error: "Parol noto'g'ri formatda" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const phone = normalizePhone(rawPhone);
    const codeHash = await hashCode(String(code).trim(), phone);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find latest unconsumed, unexpired code
    const { data: rows } = await admin
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("consumed", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const otp = rows?.[0];
    if (!otp) {
      return new Response(JSON.stringify({ error: "Kod topilmadi yoki muddati o'tgan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (otp.attempts >= 5) {
      await admin.from("otp_codes").update({ consumed: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Juda ko'p noto'g'ri urinish" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (otp.code_hash !== codeHash) {
      await admin.from("otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Kod noto'g'ri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark consumed
    await admin.from("otp_codes").update({ consumed: true }).eq("id", otp.id);

    const email = phoneToEmail(phone);

    // Find or create user
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, /* filter not supported, scan */ });
    let userId: string | null = null;

    // Use direct lookup via getUserByEmail-equivalent: scan by listing with email filter is unsupported,
    // If user provided a password, use it; otherwise use random (legacy OTP-only flow)
    const password = userPassword ?? randomPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone, display_name: name ?? null },
    });

    if (createErr && !/already|registered|exists/i.test(createErr.message)) {
      throw createErr;
    }

    if (created?.user) {
      userId = created.user.id;
    } else {
      let page = 1;
      while (!userId && page <= 20) {
        const { data: lp } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const found = lp?.users?.find((u: any) => u.email === email);
        if (found) { userId = found.id; break; }
        if (!lp?.users || lp.users.length < 200) break;
        page++;
      }
      if (!userId) throw new Error("Foydalanuvchi topilmadi");
      // Always reset password to the value we'll sign in with
      await admin.auth.admin.updateUserById(userId, { password });
    }

    // Update profile + mark password_set if user supplied one
    if (userId) {
      const profileUpdate: Record<string, unknown> = {
        user_id: userId,
        phone,
      };
      if (name) profileUpdate.display_name = name;
      if (userPassword !== undefined) profileUpdate.password_set = true;
      await admin.from("profiles").upsert(profileUpdate, { onConflict: "user_id" });
    }

    // Sign in to get session tokens
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: signin, error: signErr } = await anon.auth.signInWithPassword({ email, password });
    if (signErr || !signin.session) throw signErr ?? new Error("Sign-in failed");

    return new Response(JSON.stringify({
      success: true,
      access_token: signin.session.access_token,
      refresh_token: signin.session.refresh_token,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("verify-otp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

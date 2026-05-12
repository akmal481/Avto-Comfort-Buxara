import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { tg, normalizePhone, deriveWebhookSecret } from "../_shared/telegram.ts";

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Verify Telegram secret token
  const expected = await deriveWebhookSecret();
  const actual = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!safeEqual(actual, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let update: any;
  try { update = await req.json(); } catch { return new Response("ok"); }

  const message = update.message ?? update.edited_message;
  if (!message?.chat?.id) return new Response(JSON.stringify({ ok: true }));

  const chatId = message.chat.id as number;
  const username = message.from?.username ?? null;
  const firstName = message.from?.first_name ?? null;

  try {
    // Handle contact share (best — official phone from Telegram)
    if (message.contact?.phone_number) {
      const phone = normalizePhone(message.contact.phone_number);
      await supabase.from("telegram_users").upsert(
        {
          phone,
          telegram_chat_id: chatId,
          telegram_username: username,
          first_name: firstName,
        },
        { onConflict: "phone" },
      );
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Raqamingiz tasdiqlandi: ${phone}\n\nEndi saytga qaytib OTP kodini kuting yoki "Kod yuborish" tugmasini bosing.`,
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    // Handle /start (with optional phone payload)
    const text = (message.text ?? "").trim();
    if (text.startsWith("/start")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `👋 Avto Comfort Buxara'ga xush kelibsiz!\n\nRo'yxatdan o'tishni yakunlash uchun pastdagi tugma orqali telefon raqamingizni ulashing.`,
        reply_markup: {
          keyboard: [[{ text: "📱 Telefon raqamni ulashish", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    // Fallback help message
    await tg("sendMessage", {
      chat_id: chatId,
      text: `Iltimos, /start buyrug'ini bosing va telefon raqamingizni ulashing.`,
    });
  } catch (e) {
    console.error("webhook error:", e);
  }

  return new Response(JSON.stringify({ ok: true }));
});

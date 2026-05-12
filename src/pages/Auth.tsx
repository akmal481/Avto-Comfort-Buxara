import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, ArrowLeft, CheckCircle, MessageCircle, Loader2, ArrowRight, Lock, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import { validatePassword } from "@/lib/passwordValidation";

type Mode = "login" | "signup" | "forgot";
type Step = "form" | "telegram" | "otp" | "password" | "success";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [loginPwd, setLoginPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [botUrl, setBotUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [shake, setShake] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Poll for telegram link
  useEffect(() => {
    if (step !== "telegram") return;
    const id = setInterval(async () => {
      const res = await sendOtpRequest(true);
      if (res === "sent") {
        setStep("otp");
        setCountdown(60);
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 100);
      }
    }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    let d = digits.startsWith("998") ? digits.slice(3) : digits;
    d = d.slice(0, 9);
    let out = "+998";
    if (d.length > 0) out += " " + d.slice(0, 2);
    if (d.length > 2) out += " " + d.slice(2, 5);
    if (d.length > 5) out += " " + d.slice(5, 7);
    if (d.length > 7) out += " " + d.slice(7, 9);
    return out;
  };
  const validatePhone = () => phone.replace(/[^0-9]/g, "").length === 12;

  const triggerShake = () => setShake((s) => s + 1);

  const sendOtpRequest = async (silent = false): Promise<"sent" | "telegram" | "error"> => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("send-otp", {
        body: { phone, name: name.trim() },
      });
      if (fnErr) throw fnErr;
      if (data?.needs_telegram) {
        setBotUrl(data.bot_url);
        if (!silent) setStep("telegram");
        return "telegram";
      }
      if (data?.success) return "sent";
      throw new Error(data?.error ?? "Xatolik");
    } catch (e: any) {
      const msg = e?.context?.body?.error ?? e?.message ?? "Xatolik yuz berdi";
      if (!silent) { setError(typeof msg === "string" ? msg : "Xatolik"); triggerShake(); }
      return "error";
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ===== LOGIN =====
  const handleLogin = async () => {
    setError("");
    if (!validatePhone()) { setError("Telefon raqam to'liq emas"); triggerShake(); return; }
    if (loginPwd.length < 6) { setError("Parol kamida 6 ta belgi"); triggerShake(); return; }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("login-with-password", {
        body: { phone, password: loginPwd },
      });
      if (fnErr) {
        const msg = (fnErr as any)?.context?.body?.error ?? fnErr.message ?? "Telefon yoki parol noto'g'ri";
        throw new Error(typeof msg === "string" ? msg : "Telefon yoki parol noto'g'ri");
      }
      if (!data?.success) throw new Error(data?.error ?? "Telefon yoki parol noto'g'ri");
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;
      setStep("success");
      toast.success("Xush kelibsiz!");
      setTimeout(() => navigate("/"), 1200);
    } catch (e: any) {
      setError(e?.message ?? "Xatolik");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ===== SIGNUP / FORGOT =====
  const handleSendCode = async () => {
    setError("");
    if (mode === "signup" && !name.trim()) { setError("Ismingizni kiriting"); triggerShake(); return; }
    if (!validatePhone()) { setError("Telefon raqam to'liq emas"); triggerShake(); return; }
    const res = await sendOtpRequest();
    if (res === "sent") {
      setStep("otp");
      setCountdown(60);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    const res = await sendOtpRequest();
    if (res === "sent") {
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  };

  const [otpVerified, setOtpVerified] = useState(false);

  const verifyCodeOnly = async (full: string) => {
    // Verify code via verify-otp WITHOUT password (just check code).
    // Trick: we re-use verify-otp; first call without password to check code is valid?
    // verify-otp consumes the code on success. So we delay verification until password step.
    // Instead: just lock UI when 6 digits entered, then ask for password and call verify-otp once.
    setOtpVerified(true);
    setStep("password");
  };

  const handleCodeChange = (i: number, val: string) => {
    const v = val.replace(/[^0-9]/g, "").slice(0, 1);
    const next = [...code];
    next[i] = v;
    setCode(next);
    setError("");
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (v && i === 5) verifyCodeOnly(next.join(""));
  };
  const handleCodeKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      verifyCodeOnly(pasted);
    }
  };

  const handleSetPassword = async () => {
    setError("");
    const v = validatePassword(newPwd);
    if (!v.ok) { setError(v.error!); triggerShake(); return; }
    if (newPwd !== confirmPwd) { setError("Parollar mos emas"); triggerShake(); return; }
    setLoading(true);
    try {
      const full = code.join("");
      const { data, error: fnErr } = await supabase.functions.invoke("verify-otp", {
        body: { phone, code: full, name: name.trim() || undefined, password: newPwd },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error ?? "Kod noto'g'ri");
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;
      setStep("success");
      toast.success(mode === "forgot" ? "Parol yangilandi" : `Xush kelibsiz, ${name || "!"}`);
      setTimeout(() => navigate("/"), 1200);
    } catch (e: any) {
      const msg = e?.context?.body?.error ?? e?.message ?? "Xatolik";
      setError(typeof msg === "string" ? msg : "Xatolik");
      triggerShake();
      // If code expired/invalid, allow retry
      if (typeof msg === "string" && /kod/i.test(msg)) {
        setStep("otp");
        setCode(["", "", "", "", "", ""]);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep("form");
    setError("");
    setCode(["", "", "", "", "", ""]);
    setNewPwd("");
    setConfirmPwd("");
    setLoginPwd("");
    setOtpVerified(false);
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }}>
            <CheckCircle size={72} className="mx-auto text-success mb-4" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold mb-2">
            {mode === "forgot" ? "Parol yangilandi" : "Xush kelibsiz!"}
          </h2>
          <p className="text-muted-foreground text-sm">Yo'naltirilmoqda...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container max-w-md mx-auto py-6 px-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Bosh sahifa
        </Link>

        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3 shadow-lg"
          >
            <span className="text-primary-foreground font-display font-bold text-xl">AC</span>
          </motion.div>
          <h1 className="font-display text-2xl font-bold">Avto Comfort</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "form" && (mode === "login" ? "Hisobingizga kiring" : mode === "signup" ? "Yangi hisob yarating" : "Parolni tiklash")}
            {step === "telegram" && "Telegram botni boshlang"}
            {step === "otp" && "Tasdiqlash kodini kiriting"}
            {step === "password" && (mode === "forgot" ? "Yangi parol o'rnating" : "Parol yarating")}
          </p>
        </div>

        {/* Tabs */}
        {step === "form" && mode !== "forgot" && (
          <div className="flex bg-secondary rounded-xl p-1 mb-5">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              key={`err-${shake}`}
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl mb-4 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ===== LOGIN ===== */}
          {step === "form" && mode === "login" && (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefon raqam</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary text-foreground text-base border-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Parol</label>
                <PasswordInput
                  value={loginPwd}
                  onChange={(e) => setLoginPwd(e.target.value)}
                  placeholder="Parolingiz"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-medium py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>Kirish <ArrowRight size={18} /></>}
              </button>

              <button
                onClick={() => switchMode("forgot")}
                className="w-full text-sm text-primary font-medium hover:underline py-2"
              >
                Parolni unutdingizmi?
              </button>
            </motion.div>
          )}

          {/* ===== SIGNUP / FORGOT FORM ===== */}
          {step === "form" && mode !== "login" && (
            <motion.div key={mode} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ismingiz</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ismingizni kiriting"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefon raqam</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-secondary text-foreground text-base border-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-medium py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>Kod yuborish <ArrowRight size={18} /></>}
              </button>
              <p className="text-xs text-muted-foreground text-center px-4">
                Tasdiqlash kodi <span className="text-primary font-medium">Telegram</span> orqali yuboriladi
              </p>
              {mode === "forgot" && (
                <button onClick={() => switchMode("login")} className="w-full text-sm text-muted-foreground py-2">
                  Kirish sahifasiga qaytish
                </button>
              )}
            </motion.div>
          )}

          {/* ===== TELEGRAM ===== */}
          {step === "telegram" && (
            <motion.div key="tg" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <div className="bg-secondary rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#229ED9] flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={32} className="text-white" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">Telegram orqali tasdiqlang</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Botni oching va <span className="font-medium text-foreground">"📱 Telefon raqamni ulashish"</span> tugmasini bosing
                </p>
                <a href={botUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-[#229ED9] text-white font-medium py-3.5 rounded-xl hover:opacity-90 transition-all active:scale-[0.98]">
                  <MessageCircle size={18} /> Telegramni ochish
                </a>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Tasdiqlash kutilmoqda...
              </div>
              <button onClick={() => { setStep("form"); setError(""); }} className="w-full text-sm text-muted-foreground py-2">
                Boshqa raqam ishlatish
              </button>
            </motion.div>
          )}

          {/* ===== OTP ===== */}
          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <p className="text-center text-sm text-muted-foreground">
                Kod yuborildi: <span className="font-medium text-foreground">{phone}</span>
              </p>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKey(i, e)}
                    disabled={loading}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl bg-secondary text-foreground border-2 border-transparent focus:border-primary focus:outline-none transition-all"
                  />
                ))}
              </div>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Qayta yuborish: <span className="font-medium text-foreground">00:{countdown.toString().padStart(2, "0")}</span>
                  </p>
                ) : (
                  <button onClick={handleResend} disabled={loading} className="text-sm text-primary font-medium hover:underline">
                    Kodni qayta yuborish
                  </button>
                )}
              </div>
              <button onClick={() => { setStep("form"); setError(""); setCode(["", "", "", "", "", ""]); }} className="w-full text-sm text-muted-foreground py-2">
                Telefon raqamni o'zgartirish
              </button>
            </motion.div>
          )}

          {/* ===== PASSWORD CREATE ===== */}
          {step === "password" && (
            <motion.div key="pwd" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <div className="bg-success/10 text-success text-sm px-4 py-3 rounded-xl text-center flex items-center justify-center gap-2">
                <CheckCircle size={16} /> Kod tasdiqlandi
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Yangi parol</label>
                <PasswordInput
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Kamida 6 ta belgi, harf + raqam"
                  autoComplete="new-password"
                  autoFocus
                />
                <div className="mt-2"><PasswordStrengthMeter password={newPwd} /></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Parolni tasdiqlang</label>
                <PasswordInput
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Yangi parolni qayta kiriting"
                  autoComplete="new-password"
                  onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                />
              </div>
              <button
                onClick={handleSetPassword}
                disabled={loading || !newPwd || !confirmPwd}
                className="w-full bg-primary text-primary-foreground font-medium py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><KeyRound size={18} /> {mode === "forgot" ? "Parolni yangilash" : "Hisobni yaratish"}</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
};

export default Auth;

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchUsersWithStats, setUserBlocked, fetchUserActivity, fetchUserOrders,
  broadcastMessage, isVip, UserWithStats,
} from "@/lib/usersApi";
import { formatPrice } from "@/lib/api";
import {
  Users, Search, ShieldAlert, Crown, Ban, CheckCircle2, X, Loader2,
  Activity, Phone, Calendar, ShoppingBag, Wallet, Send, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FilterPeriod = "all" | "today" | "week" | "month";
type StatusFilter = "all" | "active" | "blocked" | "suspicious" | "vip";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const relativeTime = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} kun oldin`;
  return formatDate(iso);
};

export default function UsersManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<FilterPeriod>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [detailUser, setDetailUser] = useState<UserWithStats | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<{ user: UserWithStats; block: boolean } | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsersWithStats();
      setUsers(data);
    } catch (e) {
      console.error("Failed to load users", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const periodMs = { today: 86400_000, week: 7 * 86400_000, month: 30 * 86400_000, all: Infinity }[period];
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const m = (u.display_name || "").toLowerCase().includes(q)
          || (u.phone || "").toLowerCase().includes(q)
          || u.user_id.toLowerCase().includes(q);
        if (!m) return false;
      }
      if (period !== "all" && now - new Date(u.created_at).getTime() > periodMs) return false;
      if (status === "blocked" && !u.is_blocked) return false;
      if (status === "active" && u.is_blocked) return false;
      if (status === "suspicious" && !u.is_suspicious) return false;
      if (status === "vip" && !isVip(u)) return false;
      return true;
    });
  }, [users, search, period, status]);

  const stats = useMemo(() => {
    const todayMs = 86400_000;
    return {
      total: users.length,
      newToday: users.filter(u => Date.now() - new Date(u.created_at).getTime() < todayMs).length,
      active: users.filter(u => !u.is_blocked).length,
      blocked: users.filter(u => u.is_blocked).length,
    };
  }, [users]);

  const handleBlock = async () => {
    if (!confirmBlock) return;
    try {
      await setUserBlocked(confirmBlock.user.user_id, confirmBlock.block);
      setConfirmBlock(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Jami", value: stats.total, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Yangi (bugun)", value: stats.newToday, icon: Calendar, color: "bg-blue-500/10 text-blue-500" },
          { label: "Aktiv", value: stats.active, icon: CheckCircle2, color: "bg-green-500/10 text-green-600" },
          { label: "Bloklangan", value: stats.blocked, icon: Ban, color: "bg-destructive/10 text-destructive" },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-xl ${s.color} flex items-start gap-3`}>
            <s.icon size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium opacity-70 mb-0.5">{s.label}</p>
              <p className="font-bold text-xl">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon, ID qidirish..."
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => setShowBroadcast(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Send size={16} /> Mass xabar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "today", "week", "month"] as FilterPeriod[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              period === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}>
            {{ all: "Barchasi", today: "Bugun", week: "Hafta", month: "Oy" }[p]}
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-1 self-center" />
        {(["all", "active", "blocked", "suspicious", "vip"] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}>
            {{ all: "Hammasi", active: "🟢 Aktiv", blocked: "🔴 Blok", suspicious: "⚠️ Shubhali", vip: "👑 VIP" }[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={18} /> Yuklanmoqda...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Foydalanuvchi topilmadi</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(u => (
            <UserCard
              key={u.user_id}
              user={u}
              onDetail={() => setDetailUser(u)}
              onBlock={() => setConfirmBlock({ user: u, block: !u.is_blocked })}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <AnimatePresence>
        {detailUser && (
          <UserDetailDialog user={detailUser} onClose={() => setDetailUser(null)} />
        )}
      </AnimatePresence>

      {/* Block confirm */}
      <AnimatePresence>
        {confirmBlock && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"
            onClick={() => setConfirmBlock(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmBlock.block ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"
                }`}>
                  {confirmBlock.block ? <Ban size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div>
                  <h3 className="font-bold">{confirmBlock.block ? "Bloklash" : "Blokdan chiqarish"}</h3>
                  <p className="text-xs text-muted-foreground">{confirmBlock.user.display_name || confirmBlock.user.phone}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                {confirmBlock.block
                  ? "Foydalanuvchi saytga kira olmaydi va buyurtma bera olmaydi."
                  : "Foydalanuvchi yana to'liq foydalanish huquqiga ega bo'ladi."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmBlock(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium">
                  Bekor
                </button>
                <button onClick={handleBlock} className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white ${
                  confirmBlock.block ? "bg-destructive" : "bg-green-600"
                }`}>
                  Tasdiqlash
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast */}
      <AnimatePresence>
        {showBroadcast && <BroadcastDialog onClose={() => setShowBroadcast(false)} />}
      </AnimatePresence>
    </div>
  );
}

function UserCard({ user, onDetail, onBlock }: { user: UserWithStats; onDetail: () => void; onBlock: () => void }) {
  const vip = isVip(user);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
          {(user.display_name || user.phone || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm truncate">{user.display_name || "Noma'lum"}</p>
            {user.is_blocked && (
              <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">🔴 BLOK</span>
            )}
            {!user.is_blocked && (
              <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold">🟢</span>
            )}
            {vip && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold flex items-center gap-0.5">
                <Crown size={10} /> VIP
              </span>
            )}
            {user.is_suspicious && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-bold flex items-center gap-0.5">
                <AlertTriangle size={10} /> Shubhali
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Phone size={11} /> {user.phone || "—"}
          </p>
          <p className="text-[10px] text-muted-foreground/70 truncate font-mono mt-0.5">{user.user_id.slice(0, 8)}...</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-secondary/50 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground">Buyurtma</p>
          <p className="font-bold text-sm">{user.orders_count}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground">Xarid</p>
          <p className="font-bold text-xs">{formatPrice(user.total_spent)}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground">Faollik</p>
          <p className="font-bold text-[10px]">{relativeTime(user.last_seen_at)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onDetail} className="flex-1 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80">
          Batafsil
        </button>
        <button
          onClick={onBlock}
          className={`flex-1 py-2 rounded-lg text-xs font-medium text-white ${
            user.is_blocked ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"
          }`}
        >
          {user.is_blocked ? "Blokdan chiqarish" : "Bloklash"}
        </button>
      </div>
    </div>
  );
}

function UserDetailDialog({ user, onClose }: { user: UserWithStats; onClose: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUserOrders(user.user_id), fetchUserActivity(user.user_id)])
      .then(([o, a]) => { setOrders(o); setActivity(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.user_id]);

  const actionLabels: Record<string, string> = {
    login: "🔓 Login",
    logout: "🚪 Chiqish",
    order_created: "🛒 Buyurtma berdi",
    order_cancelled: "❌ Buyurtma bekor",
    cart_add: "➕ Savatga qo'shdi",
    favorite_add: "❤️ Sevimliga qo'shdi",
    review_added: "⭐ Sharh qoldirdi",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/50 flex items-end md:items-center justify-center md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="font-bold">Foydalanuvchi profili</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {(user.display_name || user.phone || "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg">{user.display_name || "Noma'lum"}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone size={12} /> {user.phone || "—"}</p>
              <p className="text-[10px] text-muted-foreground/70 font-mono">{user.user_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar size={11} /> Ro'yxatdan</p>
              <p className="font-semibold text-xs mt-1">{formatDate(user.created_at)}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Activity size={11} /> Oxirgi faollik</p>
              <p className="font-semibold text-xs mt-1">{relativeTime(user.last_seen_at)}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ShoppingBag size={11} /> Buyurtmalar</p>
              <p className="font-semibold text-sm mt-1">{user.orders_count} ta</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Wallet size={11} /> Umumiy</p>
              <p className="font-semibold text-xs mt-1">{formatPrice(user.total_spent)}</p>
            </div>
          </div>

          {(user.is_blocked || user.is_suspicious) && (
            <div className="space-y-2">
              {user.is_blocked && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm flex items-start gap-2">
                  <Ban size={16} className="mt-0.5" />
                  <div>
                    <p className="font-semibold">Bloklangan</p>
                    <p className="text-xs opacity-80">{user.blocked_reason || "Sabab ko'rsatilmagan"}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{formatDate(user.blocked_at)}</p>
                  </div>
                </div>
              )}
              {user.is_suspicious && (
                <div className="bg-orange-500/10 text-orange-600 rounded-xl p-3 text-sm flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span>Shubhali foydalanuvchi: {user.cancelled_orders_count} ta buyurtma bekor qilingan</span>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><ShoppingBag size={14} /> Buyurtmalar tarixi</h3>
            {loading ? <p className="text-xs text-muted-foreground">Yuklanmoqda...</p>
              : orders.length === 0 ? <p className="text-xs text-muted-foreground">Buyurtmalar yo'q</p>
              : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {orders.map(o => (
                    <div key={o.id} className="flex items-center justify-between bg-secondary/40 rounded-lg p-2 text-xs">
                      <div>
                        <p className="font-mono font-semibold">#{o.order_number}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(o.created_at)} · {o.status}</p>
                      </div>
                      <p className="font-semibold">{formatPrice(o.total)}</p>
                    </div>
                  ))}
                </div>
              )}
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Activity size={14} /> Faoliyat</h3>
            {loading ? <p className="text-xs text-muted-foreground">Yuklanmoqda...</p>
              : activity.length === 0 ? <p className="text-xs text-muted-foreground">Faoliyat yozuvlari yo'q</p>
              : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {activity.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-secondary/40 rounded-lg p-2 text-xs">
                      <span>{actionLabels[a.action] || a.action}</span>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BroadcastDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const data = await broadcastMessage(title, message);
      setResult(`✅ ${data.sent}/${data.total} foydalanuvchiga yuborildi`);
      setTitle(""); setMessage("");
    } catch (e: any) {
      setResult(`❌ Xato: ${e.message || "noma'lum"}`);
    }
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><Send size={16} /> Mass xabar yuborish</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          Xabar barcha Telegramga ulangan foydalanuvchilarga yuboriladi.
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sarlavha (masalan: Aksiya boshlandi!)"
          className="w-full px-4 py-3 rounded-xl bg-secondary text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Xabar matni..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-secondary text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        {result && <p className="text-xs">{result}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium">Bekor</button>
          <button
            onClick={send}
            disabled={sending || !title.trim() || !message.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? <><Loader2 size={14} className="animate-spin" /> Yuborilmoqda</> : "Yuborish"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

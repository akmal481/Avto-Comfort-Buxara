import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchProducts, fetchOrders, formatPrice, DbProduct, DbOrder } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OrderProgress from "@/components/OrderProgress";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { User, Package, Heart, Globe, Moon, Sun, Bell, ChevronRight, ArrowLeft, Shield, LogOut, ShoppingBag, Clock, CheckCircle, Camera, Lock, Loader2, Pencil, Search, Receipt, Wallet, KeyRound } from "lucide-react";
import OrderReceipt from "@/components/OrderReceipt";
import type { OrderStatus } from "@/contexts/OrderContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";

type Tab = "profile" | "orders" | "favorites" | "language" | "theme" | "notifications" | "password";

type OrderFilter = "active" | "delivered" | "all";
type DateFilter = "all" | "today" | "week" | "month";

type MenuItem = { key: Tab; label: string; icon: React.ElementType; desc?: string };
type MenuGroup = { title: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    title: "Asosiy",
    items: [
      { key: "profile", label: "Profil", icon: User, desc: "Shaxsiy ma'lumotlar" },
      { key: "orders", label: "Buyurtmalarim", icon: Package, desc: "Faol va yetkazilganlar" },
      { key: "favorites", label: "Sevimlilar", icon: Heart, desc: "Saqlangan mahsulotlar" },
    ],
  },
  {
    title: "Sozlamalar",
    items: [
      { key: "password", label: "Parolni o'zgartirish", icon: Lock, desc: "Hisob xavfsizligi" },
      { key: "language", label: "Til", icon: Globe, desc: "Interfeys tili" },
      { key: "theme", label: "Tema", icon: Moon, desc: "Yorug' yoki qorong'u" },
      { key: "notifications", label: "Bildirishnomalar", icon: Bell, desc: "Push xabarlar" },
    ],
  },
];

const tabs: MenuItem[] = menuGroups.flatMap(g => g.items);

const statusLabels: Record<string, string> = {
  accepted: "Qabul qilindi",
  preparing: "Yig'ilmoqda",
  shipping: "Yo'lda",
  delivered: "Yetkazildi",
};
const statusIcons: Record<string, string> = {
  accepted: "🟡", preparing: "📦", shipping: "🚚", delivered: "✅",
};

const Settings = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const { favorites } = useFavorites();
  const { theme, toggleTheme } = useTheme();
  const [profileName, setProfileName] = useState("Foydalanuvchi");
  const [profilePhone, setProfilePhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdShake, setPwdShake] = useState(0);
  const [language, setLanguage] = useState("uz");
  const [notifications, setNotifications] = useState({ orders: true, promo: false, news: true });
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("active");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<DbOrder | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(console.error);
  }, []);

  // Load profile from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfileName(data.display_name || "Foydalanuvchi");
        setProfilePhone(data.phone || "");
        setAvatarUrl(data.avatar_url || "");
      }
    })();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fayl juda katta", description: "Maks 5MB", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = urlData.publicUrl;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast({ title: "Avatar yangilandi ✅" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    }
    setUploadingAvatar(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: profileName.trim(), phone: profilePhone.trim() })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil saqlandi ✅" });
    }
  };

  const handleChangePassword = async () => {
    setPwdError("");
    if (!currentPassword) {
      setPwdError("Hozirgi parolni kiriting"); setPwdShake((s) => s + 1); return;
    }
    const { validatePassword } = await import("@/lib/passwordValidation");
    const v = validatePassword(newPassword);
    if (!v.ok) { setPwdError(v.error!); setPwdShake((s) => s + 1); return; }
    if (newPassword !== confirmPassword) {
      setPwdError("Parollar mos emas"); setPwdShake((s) => s + 1); return;
    }
    setChangingPwd(true);
    try {
      const { data, error } = await supabase.functions.invoke("change-password", {
        body: { current_password: currentPassword, new_password: newPassword },
      });
      if (error) {
        const msg = (error as any)?.context?.body?.error ?? error.message ?? "Xatolik";
        throw new Error(typeof msg === "string" ? msg : "Xatolik");
      }
      if (!data?.success) throw new Error(data?.error ?? "Xatolik");
      toast({ title: "Parol muvaffaqiyatli o'zgartirildi ✅" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      setPwdError(e?.message ?? "Xatolik"); setPwdShake((s) => s + 1);
    } finally {
      setChangingPwd(false);
    }
  };

  // Load user orders
  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    const loadOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setOrders(data as DbOrder[]);
      } catch (e) {
        console.error("Failed to load orders", e);
      }
      setOrdersLoading(false);
    };
    loadOrders();
  }, [user]);

  // Realtime order updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-orders-" + user.id)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setOrders(prev => prev.map(o => o.id === (payload.new as DbOrder).id ? payload.new as DbOrder : o));
        } else if (payload.eventType === "INSERT") {
          setOrders(prev => [payload.new as DbOrder, ...prev]);
        } else if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { id?: string })?.id;
          if (oldId) setOrders(prev => prev.filter(o => o.id !== oldId));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  const now = Date.now();
  const dateFilterMs: Record<DateFilter, number> = {
    all: Infinity,
    today: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  const filteredOrders = orders
    .filter(o => orderFilter === "all" ? true : orderFilter === "delivered" ? o.status === "delivered" : o.status !== "delivered")
    .filter(o => now - new Date(o.created_at).getTime() <= dateFilterMs[dateFilter])
    .filter(o => {
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      return o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q);
    });

  const totalSpent = orders.reduce((s, o) => s + o.total, 0);

  const initials = (profileName || "U").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-lg">
                  <AvatarImage src={avatarUrl} alt={profileName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-transform">
                  {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              </div>
              <div className="text-center">
                <h3 className="font-display font-bold text-lg">{profileName}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ism</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} maxLength={60}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+998 90 123 45 67" maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button onClick={handleSaveProfile} disabled={savingProfile}
              className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl mt-2 hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {savingProfile && <Loader2 size={16} className="animate-spin" />}
              Saqlash
            </button>
          </div>
        );
      case "password":
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-2xl p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Shield size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm mb-0.5">Hisob xavfsizligi</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Parolingizni muntazam yangilab turing. Yangi parol kamida 6 ta belgi, harf va raqamdan iborat bo'lishi kerak.
                </p>
              </div>
            </div>

            <AnimatePresence>
              {pwdError && (
                <motion.div
                  key={`pe-${pwdShake}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl text-center"
                >
                  {pwdError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Hozirgi parol</label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Hozirgi parolingiz"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Yangi parol</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi, harf + raqam"
                  autoComplete="new-password"
                />
                <div className="mt-2"><PasswordStrengthMeter password={newPassword} /></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Parolni tasdiqlang</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yangi parolni qayta kiriting"
                  autoComplete="new-password"
                  onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPwd || !currentPassword || !newPassword || !confirmPassword}
                className="w-full bg-primary text-primary-foreground font-medium py-3.5 rounded-xl mt-1 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {changingPwd ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Parolni o'zgartirish
              </button>
            </div>
          </div>
        );
      case "orders":
        return (
          <div>
            {/* Stats */}
            {orders.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-3 border border-primary/10">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                    <ShoppingBag size={12} /> Buyurtmalar
                  </div>
                  <div className="font-display font-bold text-lg">{orders.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/15 to-green-500/5 rounded-2xl p-3 border border-green-500/10">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                    <Wallet size={12} /> Sarflandi
                  </div>
                  <div className="font-display font-bold text-sm truncate">{formatPrice(totalSpent)}</div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="ID yoki mahsulot bo'yicha qidirish..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-2 mb-2">
              <FilterChip active={orderFilter === "active"} onClick={() => setOrderFilter("active")} icon={Clock} label={`Faollar (${orders.filter(o => o.status !== "delivered").length})`} />
              <FilterChip active={orderFilter === "delivered"} onClick={() => setOrderFilter("delivered")} icon={CheckCircle} label={`Yetkazilgan (${orders.filter(o => o.status === "delivered").length})`} />
              <FilterChip active={orderFilter === "all"} onClick={() => setOrderFilter("all")} icon={Package} label={`Hammasi (${orders.length})`} />
            </div>

            {/* Date filter */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
              {([["all", "Barchasi"], ["today", "Bugun"], ["week", "Hafta"], ["month", "Oy"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setDateFilter(k)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                    dateFilter === k ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                  }`}
                >{label}</button>
              ))}
            </div>

            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                    <div className="h-4 bg-secondary rounded w-1/3 mb-3" />
                    <div className="h-3 bg-secondary rounded w-full mb-2" />
                    <div className="h-3 bg-secondary rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm">{order.order_number}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{statusIcons[order.status]}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          order.status === "delivered"
                            ? "bg-green-500/10 text-green-600"
                            : order.status === "shipping"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {statusLabels[order.status]}
                        </span>
                      </div>
                    </div>
                    <OrderProgress status={order.status as OrderStatus} />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("uz-UZ", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      <span className="font-display font-bold">{formatPrice(order.total)}</span>
                    </div>
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary font-medium text-sm hover:bg-primary/15 transition-colors"
                    >
                      <Receipt size={14} /> Chekni ko'rish
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
                  {orderFilter === "active" ? (
                    <CheckCircle size={36} className="text-primary/30" />
                  ) : (
                    <ShoppingBag size={36} className="text-muted-foreground/30" />
                  )}
                </div>
                <h3 className="font-display font-bold text-base mb-1">
                  {orderSearch ? "Hech narsa topilmadi" : orderFilter === "active" ? "Faol buyurtmalar yo'q" : "Buyurtmalar yo'q"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {orderSearch ? "Boshqa kalit so'z bilan urinib ko'ring" :
                    orderFilter === "active" ? "Barcha buyurtmalar yetkazib berilgan ✅" : "Birinchi buyurtmangizni bering"}
                </p>
                {!user && (
                  <Link to="/auth" className="inline-block mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
                    Kirish
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      case "favorites":
        return favoriteProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {favoriteProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Sevimlilar yo'q</p>
          </div>
        );
      case "language":
        return (
          <div className="space-y-2">
            {[{ code: "uz", label: "O'zbekcha 🇺🇿" }, { code: "ru", label: "Русский 🇷🇺" }, { code: "en", label: "English 🇬🇧" }].map((lang) => (
              <button key={lang.code} onClick={() => setLanguage(lang.code)}
                className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  language === lang.code ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"}`}>
                {lang.label}
              </button>
            ))}
          </div>
        );
      case "theme":
        return (
          <div className="space-y-3">
            {[{ key: "light" as const, label: "Yorug'", icon: Sun }, { key: "dark" as const, label: "Qorong'u", icon: Moon }].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { if (theme !== key) toggleTheme(); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  theme === key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"}`}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-3">
            {([["orders", "Buyurtma yangiliklari"], ["promo", "Aksiya va chegirmalar"], ["news", "Yangiliklar"]] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-secondary">
                <span className="text-sm font-medium">{label}</span>
                <button onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${notifications[key] ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${notifications[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {activeTab ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setActiveTab(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft size={16} /> Sozlamalar
              </button>
              <h1 className="font-display text-xl font-bold mb-6">{tabs.find((t) => t.key === activeTab)?.label}</h1>
              {renderContent()}
            </motion.div>
          ) : (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Premium Profile Header */}
              {user ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-border shadow-sm"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
                  <div className="relative p-5 flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-20 h-20 border-4 border-card shadow-lg">
                        <AvatarImage src={avatarUrl} alt={profileName} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card" title="Online" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display font-bold text-lg truncate">{profileName}</h2>
                      {profilePhone && <p className="text-sm text-foreground/70 truncate">{profilePhone}</p>}
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        ⭐ Faol foydalanuvchi
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="shrink-0 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-sm"
                      aria-label="Edit profile"
                    >
                      <Pencil size={16} className="text-primary" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <Link to="/auth" className="flex items-center gap-4 mb-6 p-4 bg-card rounded-2xl border border-border hover:bg-secondary transition-colors">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><User size={24} className="text-primary" /></div>
                  <div className="flex-1">
                    <h2 className="font-display font-bold">Kirish / Ro'yxatdan o'tish</h2>
                    <p className="text-sm text-muted-foreground">Buyurtmalar, sevimlilar va boshqalar</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              )}

              {/* Grouped menu */}
              {menuGroups.map((group, gi) => (
                <div key={group.title} className="mb-5">
                  <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1 mb-2">
                    {group.title}
                  </h3>
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
                    {group.items.map(({ key, label, icon: Icon, desc }, i) => (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: gi * 0.05 + i * 0.03 }}
                        onClick={() => setActiveTab(key)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/60 active:bg-secondary transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{label}</div>
                          {desc && <div className="text-xs text-muted-foreground truncate">{desc}</div>}
                        </div>
                        {key === "favorites" && favoriteProducts.length > 0 && (
                          <span className="text-xs bg-destructive/10 text-destructive font-bold px-2 py-0.5 rounded-full">{favoriteProducts.length}</span>
                        )}
                        {key === "orders" && orders.filter(o => o.status !== "delivered").length > 0 && (
                          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                            {orders.filter(o => o.status !== "delivered").length}
                          </span>
                        )}
                        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Admin block */}
              <div className="mb-5">
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1 mb-2">
                  Admin
                </h3>
                <Link
                  to={isAdmin ? "/admin" : "/admin-login"}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 hover:from-primary/20 hover:to-primary/10 transition-all shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-bold block">🔐 Admin panel</span>
                    <span className="text-xs text-muted-foreground">Mahsulotlar, buyurtmalar, sozlamalar</span>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              </div>

              {/* Sign out */}
              {user && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/15 transition-colors text-destructive font-semibold text-sm"
                >
                  <LogOut size={18} />
                  Chiqish
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {receiptOrder && <OrderReceipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
      </main>
      <BottomNav />
    </div>
  );
};

const FilterChip = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
    }`}
  >
    <Icon size={12} className="inline mr-1" />
    {label}
  </button>
);

export default Settings;

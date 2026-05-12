import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchProducts, fetchCategories, fetchOrders, fetchOrderItems,
  createProduct, updateProduct, deleteProduct as apiDeleteProduct,
  createCategory, updateCategory, deleteCategory as apiDeleteCategory,
  updateOrderStatus as apiUpdateOrderStatus, uploadProductImage,
  formatPrice, DbProduct, DbCategory, DbOrder, DbOrderItem, findProductByQR,
  fetchSoldItems, moveOrderToSold, returnSoldItem, DbSoldItem,
  archiveSoldItem, unarchiveSoldItem, deleteSoldItemPermanently, deleteOrder
} from "@/lib/api";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import QRScanner from "@/components/QRScanner";
import OrderProgress from "@/components/OrderProgress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Layers, ShoppingBag, BarChart3, Plus, Pencil, Trash2, X,
  LogOut, Bell, Search, Upload, Settings, Menu, ChevronLeft, AlertTriangle, ScanLine, QrCode,
  TrendingUp, Users, DollarSign, Moon, Sun, CheckCircle2, RotateCcw, ArrowRight, Archive, ArchiveRestore
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { OrderStatus } from "@/contexts/OrderContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import UsersManagement from "@/components/admin/UsersManagement";

type AdminTab = "dashboard" | "products" | "categories" | "orders" | "sold" | "archive" | "settings" | "users";

const adminTabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Boshqaruv", icon: BarChart3 },
  { key: "products", label: "Mahsulotlar", icon: Package },
  { key: "categories", label: "Kategoriyalar", icon: Layers },
  { key: "orders", label: "Buyurtmalar", icon: ShoppingBag },
  { key: "sold", label: "Sotilganlar", icon: TrendingUp },
  { key: "archive", label: "Arxiv", icon: Archive },
  { key: "settings", label: "Sozlamalar", icon: Settings },
  { key: "users", label: "Foydalanuvchilar", icon: Users },
];

type SoldPeriod = "today" | "week" | "month" | "year" | "all";

const Admin = () => {
  const { isAdmin, isLoading, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, DbOrderItem[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [newOrderNotif, setNewOrderNotif] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "product" | "category"; id: string; name: string } | null>(null);
  const [soldPeriod, setSoldPeriod] = useState<SoldPeriod>("all");
  const [usersCount, setUsersCount] = useState(0);
  const [soldItems, setSoldItems] = useState<DbSoldItem[]>([]);
  const [confirmSold, setConfirmSold] = useState<{ action: "move" | "return" | "archive" | "unarchive"; order?: DbOrder; soldItem?: DbSoldItem } | null>(null);
  const [soldSearchQuery, setSoldSearchQuery] = useState("");
  const [confirmHardDelete, setConfirmHardDelete] = useState<DbSoldItem | null>(null);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<DbOrder | null>(null);

  // Form states
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pOldPrice, setPOldPrice] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pCat, setPCat] = useState("");
  const [pImages, setPImages] = useState<string[]>([]);
  const [pQrCode, setPQrCode] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRPreview, setShowQRPreview] = useState<DbProduct | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showFormQRScanner, setShowFormQRScanner] = useState(false);
  const [qrDuplicateWarning, setQrDuplicateWarning] = useState("");

  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<DbCategory | null>(null);
  const [cName, setCName] = useState("");
  const [cIcon, setCIcon] = useState("📦");

  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    if (!isLoading && !user) navigate("/admin-login");
    else if (!isLoading && user && !isAdmin) navigate("/settings");
  }, [isAdmin, isLoading, user, navigate]);

  const loadData = useCallback(async () => {
    try {
      const [p, c, o, s] = await Promise.all([fetchProducts(), fetchCategories(), fetchOrders(), fetchSoldItems()]);
      setProducts(p); setCategories(c); setOrders(o); setSoldItems(s);
    } catch (e) { console.error("Failed to load data", e); }
  }, []);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]);

  // Load users count
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => {
      setUsersCount(count || 0);
    });
  }, [isAdmin]);

  // Real-time orders
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders((prev) => [payload.new as DbOrder, ...prev]);
          setNewOrderNotif((p) => p + 1);
        } else if (payload.eventType === "UPDATE") {
          setOrders((prev) => prev.map((o) => o.id === (payload.new as DbOrder).id ? payload.new as DbOrder : o));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const loadOrderItems = async (orderId: string) => {
    if (orderItemsMap[orderId]) return;
    const items = await fetchOrderItems(orderId);
    setOrderItemsMap((prev) => ({ ...prev, [orderId]: items }));
  };

  // Product CRUD
  const openProductForm = (product?: DbProduct) => {
    if (product) {
      setEditingProduct(product);
      setPName(product.name); setPPrice(product.price.toString());
      setPOldPrice(product.old_price?.toString() || ""); setPDesc(product.description);
      setPCat(product.category_id || ""); setPImages(product.images);
      setPQrCode(product.qr_code || "");
    } else {
      setEditingProduct(null);
      setPName(""); setPPrice(""); setPOldPrice(""); setPDesc("");
      setPCat(categories[0]?.id || ""); setPImages([]); setPQrCode("");
    }
    setShowProductForm(true); setSidebarOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) { urls.push(await uploadProductImage(file)); }
      setPImages((prev) => [...prev, ...urls]);
    } catch (err) { console.error("Upload failed", err); }
    setUploading(false);
  };

  const generateQRCode = () => setPQrCode(`AC-${Date.now().toString(36).toUpperCase()}`);

  const checkQRDuplicate = (qrCode: string) => {
    const existing = products.find((p) => p.qr_code === qrCode && p.id !== editingProduct?.id);
    setQrDuplicateWarning(existing ? `Bu QR kod "${existing.name}" mahsulotiga biriktirilgan!` : "");
  };

  const handleFormQRScan = (result: string) => { setPQrCode(result); setShowFormQRScanner(false); checkQRDuplicate(result); };

  const saveProduct = async () => {
    if (!pName || !pPrice) return;
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: pName, price: Number(pPrice), old_price: pOldPrice ? Number(pOldPrice) : null,
          description: pDesc, category_id: pCat || null, images: pImages, qr_code: pQrCode || null,
        });
      } else {
        await createProduct({
          name: pName, price: Number(pPrice), old_price: pOldPrice ? Number(pOldPrice) : null,
          description: pDesc, category_id: pCat || null,
          images: pImages.length > 0 ? pImages : ["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop"],
          in_stock: true, qr_code: pQrCode || null,
        });
      }
      setShowProductForm(false); loadData();
    } catch (err) { console.error("Save product failed", err); }
  };

  const handleAdminQRScan = async (result: string) => {
    try {
      const product = await findProductByQR(result);
      if (product) { openProductForm(product); setActiveTab("products"); }
      else { openProductForm(); setPQrCode(result); setActiveTab("products"); }
    } catch (e) { console.error("QR scan error", e); }
  };

  const handleDeleteProduct = async (id: string) => {
    try { await apiDeleteProduct(id); loadData(); setConfirmDelete(null); } catch (err) { console.error(err); }
  };

  const openCatForm = (cat?: DbCategory) => {
    if (cat) { setEditingCat(cat); setCName(cat.name); setCIcon(cat.icon); }
    else { setEditingCat(null); setCName(""); setCIcon("📦"); }
    setShowCatForm(true); setSidebarOpen(false);
  };

  const saveCat = async () => {
    if (!cName) return;
    try {
      if (editingCat) await updateCategory(editingCat.id, { name: cName, icon: cIcon });
      else await createCategory({ name: cName, icon: cIcon });
      setShowCatForm(false); loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteCat = async (id: string) => {
    try { await apiDeleteCategory(id); loadData(); setConfirmDelete(null); } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try { await apiUpdateOrderStatus(orderId, status); loadData(); } catch (err) { console.error(err); }
  };

  const handleMoveToSold = async (order: DbOrder) => {
    try {
      if (!orderItemsMap[order.id]) {
        const items = await fetchOrderItems(order.id);
        setOrderItemsMap((prev) => ({ ...prev, [order.id]: items }));
        await moveOrderToSold(order, items, products);
      } else {
        await moveOrderToSold(order, orderItemsMap[order.id], products);
      }
      setConfirmSold(null);
      loadData();
    } catch (err) { console.error("Move to sold failed", err); }
  };

  const handleReturnSoldItem = async (item: DbSoldItem) => {
    try {
      await returnSoldItem(item);
      setConfirmSold(null);
      loadData();
    } catch (err) { console.error("Return sold item failed", err); }
  };

  const handleArchiveSold = async (item: DbSoldItem) => {
    try { await archiveSoldItem(item.id); setConfirmSold(null); loadData(); }
    catch (err) { console.error("Archive failed", err); }
  };

  const handleUnarchiveSold = async (item: DbSoldItem) => {
    try { await unarchiveSoldItem(item.id); setConfirmSold(null); loadData(); }
    catch (err) { console.error("Unarchive failed", err); }
  };

  const handleHardDeleteSold = async (item: DbSoldItem) => {
    try {
      await deleteSoldItemPermanently(item.id);
      // Also remove the original order so it disappears from the customer's "Buyurtmalarim"
      try { await deleteOrder(item.order_id); } catch (e) { console.error("Order delete after archive failed", e); }
      setConfirmHardDelete(null);
      loadData();
    } catch (err) { console.error("Hard delete failed", err); }
  };

  const handleDeleteOrder = async (order: DbOrder) => {
    try {
      await deleteOrder(order.id);
      setConfirmDeleteOrder(null);
      loadData();
    } catch (err) {
      console.error("Delete order failed", err);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) { setPasswordMsg("Parol kamida 6 belgi bo'lishi kerak"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPasswordMsg("Xato: " + error.message);
    else { setPasswordMsg("Parol o'zgartirildi!"); setNewPassword(""); }
  };

  const statuses: OrderStatus[] = ["accepted", "preparing", "shipping", "delivered"];
  const statusLabels: Record<string, string> = {
    accepted: "Qabul qilindi", preparing: "Yig'ilmoqda", shipping: "Yo'lda", delivered: "Yetkazildi",
  };
  const statusIcons: Record<string, string> = {
    accepted: "🟡", preparing: "📦", shipping: "🚚", delivered: "✅",
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.qr_code && p.qr_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredOrders = orders.filter((o) =>
    !o.moved_to_sold &&
    (o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_phone.includes(searchQuery))
  );

  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const deliveredTotal = deliveredOrders.reduce((a, o) => a + o.total, 0);
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());

  // Chart data - last 7 days
  const chartData = useMemo(() => {
    const days: { name: string; sotuv: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
      const dayTotal = orders
        .filter(o => o.status === "delivered" && new Date(o.created_at).toDateString() === d.toDateString())
        .reduce((a, o) => a + o.total, 0);
      days.push({ name: dayStr, sotuv: dayTotal });
    }
    return days;
  }, [orders]);

  // Load order items for delivered orders
  useEffect(() => {
    deliveredOrders.forEach(o => { if (!orderItemsMap[o.id]) loadOrderItems(o.id); });
  }, [deliveredOrders.length]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div></div>;
  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Admin paneliga kirish uchun login qiling</p>
        <button onClick={() => navigate("/admin-login")} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium">Kirish</button>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">AC</span>
            </div>
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-muted-foreground"><X size={18} /></button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminTabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setActiveTab(key); setSearchQuery(""); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}>
              <Icon size={18} /> <span>{label}</span>
              {key === "orders" && newOrderNotif > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold">{newOrderNotif}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-all">
            {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            {theme === "dark" ? "Yorug' rejim" : "Qorong'u rejim"}
          </button>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
            <LogOut size={18} /> Chiqish
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-secondary"><Menu size={20} /></button>
          <h1 className="font-bold text-base flex-1 truncate">{adminTabs.find(t => t.key === activeTab)?.label}</h1>
          <div className="flex items-center gap-2">
            {newOrderNotif > 0 && (
              <button onClick={() => { setActiveTab("orders"); setNewOrderNotif(0); }} className="relative p-2 rounded-xl bg-primary/10 text-primary">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{newOrderNotif}</span>
              </button>
            )}
            <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"><ChevronLeft size={18} /></button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-8 overflow-y-auto">
          {/* Search */}
          {(activeTab === "products" || activeTab === "orders") && (
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === "products" ? "Mahsulot, QR kod, ID qidirish..." : "Buyurtma, ism, telefon qidirish..."}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {activeTab === "products" && (
                <button onClick={() => setShowQRScanner(true)} className="p-3 rounded-xl bg-primary/10 text-primary" title="QR Scan">
                  <ScanLine size={18} />
                </button>
              )}
            </div>
          )}

          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Mahsulotlar", value: products.length, icon: Package, color: "bg-primary/10 text-primary" },
                  { label: "Buyurtmalar", value: orders.length, icon: ShoppingBag, color: "bg-blue-500/10 text-blue-500" },
                  { label: "Bugungi", value: todayOrders.length, icon: Bell, color: "bg-amber-500/10 text-amber-500" },
                  { label: "Foydalanuvchilar", value: usersCount, icon: Users, color: "bg-purple-500/10 text-purple-500" },
                ].map((s) => (
                  <div key={s.label} className={`p-4 rounded-xl ${s.color} flex items-start gap-3`}>
                    <s.icon size={20} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium opacity-70 mb-0.5">{s.label}</p>
                      <p className="font-bold text-xl">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-green-500/10 text-green-600">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={16} />
                    <span className="text-xs font-medium">Umumiy daromad</span>
                  </div>
                  <p className="font-bold text-lg">{formatPrice(deliveredTotal)}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-medium">Yetkazilgan</span>
                  </div>
                  <p className="font-bold text-lg">{deliveredOrders.length} ta</p>
                </div>
              </div>

              {/* Sales chart */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-bold text-sm mb-3">📈 Haftalik sotuv</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <Tooltip formatter={(value: number) => [formatPrice(value), "Sotuv"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Bar dataKey="sotuv" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent orders */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-bold text-sm mb-3">So'nggi buyurtmalar</h3>
                <div className="space-y-2">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium block truncate">{o.customer_name}</span>
                        <span className="text-xs text-muted-foreground">{o.order_number}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs block">{statusIcons[o.status]} {statusLabels[o.status]}</span>
                        <span className="text-sm font-bold">{formatPrice(o.total)}</span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-sm text-muted-foreground">Buyurtmalar yo'q</p>}
                </div>
              </div>

              {/* Top products */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-bold text-sm mb-3">🔥 Eng ko'p sotilgan</h3>
                {products.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold block">{formatPrice(p.price)}</span>
                      {!p.in_stock && <span className="text-[10px] text-destructive">Tugagan</span>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Products tab */}
          {activeTab === "products" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">{filteredProducts.length} ta mahsulot</span>
                <button onClick={() => openProductForm()} className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-transform">
                  <Plus size={16} /> Qo'shish
                </button>
              </div>
              <div className="space-y-2">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
                    <img src={p.images[0] || "/placeholder.svg"} alt={p.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium line-clamp-1">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {!p.in_stock && <span className="text-[10px] text-destructive font-medium px-1.5 py-0.5 bg-destructive/10 rounded">Tugagan</span>}
                        {p.in_stock && <span className="text-[10px] text-green-600 font-medium px-1.5 py-0.5 bg-green-500/10 rounded">Mavjud</span>}
                        {p.qr_code && <span className="text-[10px] text-primary font-medium">📱 QR</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {p.qr_code && (
                        <button onClick={() => setShowQRPreview(p)} className="p-2.5 rounded-xl hover:bg-primary/10 text-primary active:scale-95 transition-transform"><QrCode size={16} /></button>
                      )}
                      <button onClick={() => openProductForm(p)} className="p-2.5 rounded-xl hover:bg-secondary text-muted-foreground active:scale-95 transition-transform"><Pencil size={16} /></button>
                      <button onClick={() => setConfirmDelete({ type: "product", id: p.id, name: p.name })} className="p-2.5 rounded-xl hover:bg-destructive/10 text-destructive active:scale-95 transition-transform"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <Package size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Mahsulotlar topilmadi</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Categories tab */}
          {activeTab === "categories" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">{categories.length} ta kategoriya</span>
                <button onClick={() => openCatForm()} className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-transform">
                  <Plus size={16} /> Qo'shish
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-4">
                    <span className="text-2xl flex-shrink-0">{c.icon}</span>
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openCatForm(c)} className="p-2.5 rounded-xl hover:bg-secondary text-muted-foreground active:scale-95 transition-transform"><Pencil size={16} /></button>
                      <button onClick={() => setConfirmDelete({ type: "category", id: c.id, name: c.name })} className="p-2.5 rounded-xl hover:bg-destructive/10 text-destructive active:scale-95 transition-transform"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Orders tab */}
          {activeTab === "orders" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {filteredOrders.length > 0 ? (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="bg-card rounded-xl border border-border p-4" onClick={() => loadOrderItems(order.id)}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <span className="font-mono font-bold text-sm">{order.order_number}</span>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm mb-3 space-y-1">
                        <p className="truncate"><span className="text-muted-foreground">Mijoz:</span> {order.customer_name}</p>
                        <p><span className="text-muted-foreground">Tel:</span> {order.customer_phone}</p>
                        <p className="truncate"><span className="text-muted-foreground">Manzil:</span> {order.customer_address}</p>
                      </div>
                      <OrderProgress status={order.status as OrderStatus} />
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {statuses.map((s) => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, s); }}
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                              order.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            }`}>
                            {statusIcons[s]} {statusLabels[s]}
                          </button>
                        ))}
                      </div>
                      {/* Sotilganlarga o'tkazish button */}
                      {order.status === "delivered" && !order.moved_to_sold && (
                        <button
                          onClick={(e) => { e.stopPropagation(); loadOrderItems(order.id); setConfirmSold({ action: "move", order }); }}
                          className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/10 text-green-600 text-sm font-medium active:scale-95 transition-all hover:bg-green-500/20">
                          <ArrowRight size={16} /> Sotilganlarga o'tkazish
                        </button>
                      )}
                      {order.moved_to_sold && (
                        <div className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium">
                          <CheckCircle2 size={14} /> Sotilganlarga o'tkazildi
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteOrder(order); }}
                        className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium active:scale-95 transition-all hover:bg-destructive/20">
                        <Trash2 size={14} /> Buyurtmani o'chirish
                      </button>
                      {orderItemsMap[order.id] && (
                        <div className="mt-3 pt-3 border-t border-border">
                          {orderItemsMap[order.id].map((item) => (
                            <div key={item.id} className="flex justify-between text-sm py-1">
                              <span className="truncate flex-1 mr-2">{item.product_name} x{item.quantity}</span>
                              <span className="flex-shrink-0">{formatPrice(item.product_price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-border flex justify-between">
                        <span className="text-sm text-muted-foreground">Jami</span>
                        <span className="font-bold">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <ShoppingBag size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Buyurtmalar yo'q</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Sold Products tab */}
          {activeTab === "sold" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Stats */}
              {(() => {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const yearStart = new Date(now.getFullYear(), 0, 1);
                const periodFilter = (d: string) => {
                  const date = new Date(d);
                  switch (soldPeriod) {
                    case "today": return date >= todayStart;
                    case "week": return date >= weekStart;
                    case "month": return date >= monthStart;
                    case "year": return date >= yearStart;
                    default: return true;
                  }
                };
                const filtered = soldItems.filter(s => !s.archived && periodFilter(s.sold_at) && (
                  !soldSearchQuery || s.product_name.toLowerCase().includes(soldSearchQuery.toLowerCase())
                ));
                const totalRevenue = filtered.reduce((a, s) => a + s.total, 0);
                const totalQty = filtered.reduce((a, s) => a + s.quantity, 0);

                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-green-500/10">
                        <p className="text-xs font-medium text-green-600 mb-1">Jami sotilgan</p>
                        <p className="font-bold text-lg text-green-700">{totalQty} dona</p>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/10">
                        <p className="text-xs font-medium text-primary mb-1">Umumiy daromad</p>
                        <p className="font-bold text-lg text-primary">{formatPrice(totalRevenue)}</p>
                      </div>
                    </div>

                    {/* Period filters */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                      {([
                        { key: "today" as SoldPeriod, label: "Bugun" },
                        { key: "week" as SoldPeriod, label: "Haftalik" },
                        { key: "month" as SoldPeriod, label: "Oylik" },
                        { key: "year" as SoldPeriod, label: "Yillik" },
                        { key: "all" as SoldPeriod, label: "Barchasi" },
                      ]).map((f) => (
                        <button key={f.key} onClick={() => setSoldPeriod(f.key)}
                          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                            soldPeriod === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={soldSearchQuery} onChange={(e) => setSoldSearchQuery(e.target.value)}
                        placeholder="Sotilgan mahsulot qidirish..."
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>

                    {/* Sold items list */}
                    <div className="bg-card rounded-xl border border-border">
                      <div className="px-4 py-3 border-b border-border">
                        <h3 className="font-bold text-sm">📊 Sotilgan mahsulotlar</h3>
                      </div>
                      {filtered.length > 0 ? (
                        <div className="divide-y divide-border">
                          {filtered.map((item, i) => (
                            <div key={item.id} className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {item.product_image && (
                                  <img src={item.product_image} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">#{i + 1}</span>
                                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} dona · {formatPrice(item.product_price)} / dona</p>
                                  <p className="text-[10px] text-muted-foreground">{new Date(item.sold_at).toLocaleDateString("uz-UZ")}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <p className="text-sm font-bold">{formatPrice(item.total)}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                  onClick={() => setConfirmSold({ action: "return", soldItem: item })}
                                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 text-amber-600 text-xs font-medium active:scale-95 transition-all hover:bg-amber-500/20">
                                  <RotateCcw size={14} /> Qaytarish
                                </button>
                                <button
                                  onClick={() => setConfirmSold({ action: "archive", soldItem: item })}
                                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 text-blue-600 text-xs font-medium active:scale-95 transition-all hover:bg-blue-500/20">
                                  <Archive size={14} /> Arxivga
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <BarChart3 size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground">Hali sotilgan mahsulot yo'q</p>
                          <p className="text-xs text-muted-foreground mt-1">Buyurtmalarda "Sotilganlarga o'tkazish" tugmasini bosing</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* Archive tab */}
          {activeTab === "archive" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {(() => {
                const archived = soldItems.filter(s => s.archived);
                const totalRevenue = archived.reduce((a, s) => a + s.total, 0);
                const totalQty = archived.reduce((a, s) => a + s.quantity, 0);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-muted">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Arxivdagi</p>
                        <p className="font-bold text-lg">{totalQty} dona</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Jami summa</p>
                        <p className="font-bold text-lg">{formatPrice(totalRevenue)}</p>
                      </div>
                    </div>
                    <div className="bg-card rounded-xl border border-border">
                      <div className="px-4 py-3 border-b border-border">
                        <h3 className="font-bold text-sm">📁 Arxivlangan buyurtmalar</h3>
                      </div>
                      {archived.length > 0 ? (
                        <div className="divide-y divide-border">
                          {archived.map((item, i) => (
                            <div key={item.id} className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {item.product_image && (
                                  <img src={item.product_image} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">#{i + 1}</span>
                                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} dona · {formatPrice(item.product_price)}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Arxiv: {item.archived_at ? new Date(item.archived_at).toLocaleDateString("uz-UZ") : "-"}
                                  </p>
                                </div>
                                <p className="text-sm font-bold flex-shrink-0">{formatPrice(item.total)}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                  onClick={() => setConfirmSold({ action: "unarchive", soldItem: item })}
                                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 text-blue-600 text-xs font-medium active:scale-95 transition-all hover:bg-blue-500/20">
                                  <ArchiveRestore size={14} /> Tiklash
                                </button>
                                <button
                                  onClick={() => setConfirmHardDelete(item)}
                                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-medium active:scale-95 transition-all hover:bg-destructive/20">
                                  <Trash2 size={14} /> Butunlay o'chirish
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Archive size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground">Arxiv bo'sh</p>
                          <p className="text-xs text-muted-foreground mt-1">Sotilganlar bo'limidan "Arxivga" tugmasini bosing</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-bold text-sm mb-2">Admin ma'lumotlari</h3>
                <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <h3 className="font-bold text-sm">Parolni o'zgartirish</h3>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Yangi parol"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={changePassword} className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl text-sm active:scale-[0.98] transition-transform">
                  O'zgartirish
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <UsersManagement />
            </motion.div>
          )}
        </main>
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showProductForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-end md:items-center justify-center" onClick={() => setShowProductForm(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto p-5">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4 md:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">{editingProduct ? "Tahrirlash" : "Yangi mahsulot"}</h3>
                <button onClick={() => setShowProductForm(false)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nomi"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="Narxi" type="number"
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={pOldPrice} onChange={(e) => setPOldPrice(e.target.value)} placeholder="Eski narx" type="number"
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Tavsif" rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <select value={pCat} onChange={(e) => setPCat(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Kategoriyasiz</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>

                {/* QR Code */}
                <div>
                  <label className="text-sm font-medium mb-2 block">QR Kod</label>
                  <div className="flex gap-2">
                    <input value={pQrCode} onChange={(e) => { setPQrCode(e.target.value); checkQRDuplicate(e.target.value); }} placeholder="QR kod (scan, avtomatik yoki qo'lda)"
                      className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <button type="button" onClick={() => setShowFormQRScanner(true)}
                      className="px-3 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium" title="QR Scan"><ScanLine size={16} /></button>
                    <button type="button" onClick={generateQRCode}
                      className="px-3 py-3 rounded-xl bg-primary/10 text-primary text-xs font-medium" title="Avtomatik"><QrCode size={16} /></button>
                  </div>
                  {qrDuplicateWarning && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-500/10 px-3 py-2 rounded-lg">
                      <AlertTriangle size={14} /> {qrDuplicateWarning}
                    </div>
                  )}
                  {pQrCode && (
                    <div className="mt-3 flex justify-center">
                      <QRCodeDisplay value={pQrCode} productName={pName} size={140} />
                    </div>
                  )}
                </div>

                {/* Image upload */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Rasmlar</label>
                  {pImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {pImages.map((img, i) => (
                        <div key={i} className="relative w-16 h-16">
                          <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                          <button onClick={() => setPImages((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-secondary text-muted-foreground text-sm cursor-pointer hover:bg-muted active:scale-[0.98] transition-all">
                    <Upload size={16} />
                    {uploading ? "Yuklanmoqda..." : "Rasm yuklash"}
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <button onClick={saveProduct} className="w-full bg-primary text-primary-foreground font-medium py-3.5 rounded-xl active:scale-[0.98] transition-transform text-sm">
                  {editingProduct ? "Saqlash" : "Qo'shish"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Form Modal */}
      <AnimatePresence>
        {showCatForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-end md:items-center justify-center" onClick={() => setShowCatForm(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4 md:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">{editingCat ? "Tahrirlash" : "Yangi kategoriya"}</h3>
                <button onClick={() => setShowCatForm(false)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Nomi"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={cIcon} onChange={(e) => setCIcon(e.target.value)} placeholder="Emoji"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={saveCat} className="w-full bg-primary text-primary-foreground font-medium py-3.5 rounded-xl active:scale-[0.98] transition-transform text-sm">
                  {editingCat ? "Saqlash" : "Qo'shish"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl w-full max-w-xs p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <h3 className="font-bold text-base mb-1">O'chirishni tasdiqlang</h3>
              <p className="text-sm text-muted-foreground mb-4">
                "<span className="font-medium text-foreground">{confirmDelete.name}</span>" ni o'chirmoqchimisiz?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl bg-secondary text-sm font-medium active:scale-95 transition-transform">Bekor qilish</button>
                <button onClick={() => confirmDelete.type === "product" ? handleDeleteProduct(confirmDelete.id) : handleDeleteCat(confirmDelete.id)}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium active:scale-95 transition-transform">O'chirish</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sold Confirmation Modal */}
      <AnimatePresence>
        {confirmSold && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setConfirmSold(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl w-full max-w-xs p-5 text-center">
              {(() => {
                const a = confirmSold.action;
                const titles: Record<string, string> = {
                  move: "Sotilganlarga o'tkazish",
                  return: "Mahsulotlarga qaytarish",
                  archive: "Arxivga o'tkazish",
                  unarchive: "Arxivdan tiklash",
                };
                const descs: Record<string, string> = {
                  move: "Haqiqatan ham sotilganlarga o'tkazmoqchimisiz?",
                  return: `"${confirmSold.soldItem?.product_name}" ni mahsulotlarga qaytarishni tasdiqlaysizmi?`,
                  archive: `"${confirmSold.soldItem?.product_name}" ni arxivga o'tkazasizmi?`,
                  unarchive: `"${confirmSold.soldItem?.product_name}" ni sotilganlarga qaytarasizmi?`,
                };
                const colors: Record<string, string> = {
                  move: "bg-green-500/10",
                  return: "bg-amber-500/10",
                  archive: "bg-blue-500/10",
                  unarchive: "bg-blue-500/10",
                };
                const btnColors: Record<string, string> = {
                  move: "bg-green-600 text-primary-foreground",
                  return: "bg-amber-500 text-primary-foreground",
                  archive: "bg-blue-600 text-primary-foreground",
                  unarchive: "bg-blue-600 text-primary-foreground",
                };
                const Icon = a === "move" ? ArrowRight : a === "return" ? RotateCcw : a === "archive" ? Archive : ArchiveRestore;
                return (
                  <>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${colors[a]}`}>
                      <Icon size={24} className="text-foreground" />
                    </div>
                    <h3 className="font-bold text-base mb-1">{titles[a]}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{descs[a]}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmSold(null)} className="flex-1 py-3 rounded-xl bg-secondary text-sm font-medium active:scale-95 transition-transform">Yo'q</button>
                      <button onClick={() => {
                        if (a === "move" && confirmSold.order) handleMoveToSold(confirmSold.order);
                        else if (a === "return" && confirmSold.soldItem) handleReturnSoldItem(confirmSold.soldItem);
                        else if (a === "archive" && confirmSold.soldItem) handleArchiveSold(confirmSold.soldItem);
                        else if (a === "unarchive" && confirmSold.soldItem) handleUnarchiveSold(confirmSold.soldItem);
                      }}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform ${btnColors[a]}`}>Ha</button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hard Delete Confirmation */}
      <AnimatePresence>
        {confirmHardDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setConfirmHardDelete(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl w-full max-w-xs p-5 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-destructive/10">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <h3 className="font-bold text-base mb-1">Butunlay o'chirish</h3>
              <p className="text-sm text-muted-foreground mb-4">
                "{confirmHardDelete.product_name}" ni butunlay o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmHardDelete(null)} className="flex-1 py-3 rounded-xl bg-secondary text-sm font-medium active:scale-95 transition-transform">Bekor qilish</button>
                <button onClick={() => handleHardDeleteSold(confirmHardDelete)}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium active:scale-95 transition-transform">Ha, o'chirish</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Order Confirmation */}
      <AnimatePresence>
        {confirmDeleteOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteOrder(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl w-full max-w-xs p-5 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-destructive/10">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <h3 className="font-bold text-base mb-1">Buyurtmani o'chirish</h3>
              <p className="text-sm text-muted-foreground mb-4">
                "{confirmDeleteOrder.order_number}" buyurtmasi butunlay o'chiriladi. Mijoz profilidan ham yo'qoladi.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDeleteOrder(null)} className="flex-1 py-3 rounded-xl bg-secondary text-sm font-medium active:scale-95 transition-transform">Bekor qilish</button>
                <button onClick={() => handleDeleteOrder(confirmDeleteOrder)}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium active:scale-95 transition-transform">Ha, o'chirish</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <QRScanner isOpen={showFormQRScanner} onClose={() => setShowFormQRScanner(false)} onScan={handleFormQRScan} />

      <AnimatePresence>
        {showQRPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setShowQRPreview(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl w-full max-w-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">QR Kod</h3>
                <button onClick={() => setShowQRPreview(null)} className="p-1 text-muted-foreground"><X size={16} /></button>
              </div>
              <QRCodeDisplay value={showQRPreview.qr_code!} productName={showQRPreview.name} size={180} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;

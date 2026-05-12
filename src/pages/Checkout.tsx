import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { createOrder, createOrderItems, formatPrice } from "@/lib/api";
import { logActivity } from "@/hooks/useActivityLogger";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address || items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
      const order = await createOrder({
        order_number: orderNumber,
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        total: totalPrice,
        user_id: user?.id || null,
      });
      await createOrderItems(
        items.map((item) => ({
          order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          quantity: item.quantity,
        }))
      );
      setOrderId(orderNumber);
      logActivity("order_created", { order_number: orderNumber, total: totalPrice });
      clearCart();
      setSuccess(true);
    } catch (err) {
      console.error("Order failed", err);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-success" />
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="font-display text-2xl font-bold mb-2">Buyurtma qabul qilindi! 🎉</motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-muted-foreground mb-2">
                Buyurtma raqami: <span className="font-mono font-bold text-foreground">{orderId}</span>
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-sm text-muted-foreground mb-8">
                Tez orada siz bilan bog'lanamiz
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-3 justify-center">
                <button onClick={() => navigate("/")} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm">Bosh sahifa</button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => navigate("/cart")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft size={16} /> Savatga qaytish
              </button>
              <h1 className="font-display text-xl font-bold mb-6">Buyurtma berish</h1>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ismingiz</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="To'liq ism" required
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Telefon raqam</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" required
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Manzil</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Yetkazib berish manzili" required rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
                <div className="bg-card rounded-xl border border-border p-4 mt-6">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Jami ({items.length} ta mahsulot)</span>
                    <span className="font-display font-bold text-foreground">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Yetkazib berish</span><span className="text-success">Bepul</span></div>
                </div>
                <button type="submit" disabled={items.length === 0 || submitting}
                  className="w-full bg-primary text-primary-foreground font-medium py-3.5 rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50">
                  {submitting ? "Yuborilmoqda..." : `Buyurtmani tasdiqlash — ${formatPrice(totalPrice)}`}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
};

export default Checkout;

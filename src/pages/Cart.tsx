import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/api";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const Cart = () => {
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-4">
        <h1 className="font-display text-xl font-bold mb-4">Savat ({totalItems})</h1>
        {items.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div key={item.product.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
                    className="flex gap-3 bg-card rounded-xl p-3 border border-border">
                    <img src={item.product.image} alt={item.product.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium line-clamp-1">{item.product.name}</h3>
                      <p className="font-display font-bold text-sm mt-1">{formatPrice(item.product.price)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"><Minus size={14} /></button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"><Plus size={14} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 h-fit sticky top-20">
              <h3 className="font-display font-bold mb-4">Buyurtma xulosasi</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Mahsulotlar ({totalItems})</span><span>{formatPrice(totalPrice)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Yetkazib berish</span><span className="text-success">Bepul</span></div>
                <div className="border-t border-border my-3" />
                <div className="flex justify-between font-display font-bold text-lg"><span>Jami</span><span>{formatPrice(totalPrice)}</span></div>
              </div>
              <button onClick={() => navigate("/checkout")} className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl mt-4 hover:opacity-90 transition-opacity active:scale-[0.98]">
                Buyurtma berish
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">Savat bo'sh</p>
            <Link to="/" className="text-primary font-medium text-sm">Xarid qilishni boshlang</Link>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Cart;

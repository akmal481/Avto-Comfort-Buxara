import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Clock, Flame } from "lucide-react";
import { fetchProducts, fetchCategories, formatPrice, DbProduct, DbCategory } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Link } from "react-router-dom";

const banners = [
  { title: "Avto aksessuarlar", subtitle: "Eng yaxshi narxlarda sifatli mahsulotlar", color: "from-primary to-warning", emoji: "🚗" },
  { title: "Yangi kelgan mahsulotlar", subtitle: "Premium sifat, arzon narx", color: "from-info to-primary", emoji: "🔥" },
  { title: "Haftalik chegirmalar", subtitle: "50% gacha chegirma", color: "from-success to-info", emoji: "💰" },
];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c] = await Promise.all([fetchProducts(), fetchCategories()]);
        setProducts(p);
        setCategories(c);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  // Auto-slide banner
  useEffect(() => {
    const timer = setInterval(() => setCurrentBanner(p => (p + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      return !selectedCategory || p.category_id === selectedCategory;
    });
  }, [selectedCategory, products]);

  const discountedProducts = useMemo(() => {
    return products.filter(p => p.old_price && p.old_price > p.price).slice(0, 6);
  }, [products]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="space-y-5">
        {/* Banner Carousel */}
        <div className="px-4 pt-3">
          <div className="relative overflow-hidden rounded-2xl">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className={`bg-gradient-to-r ${banners[currentBanner].color} p-5 md:p-10 text-primary-foreground relative`}
              onClick={() => setCurrentBanner(p => (p + 1) % banners.length)}
            >
              <div className="relative z-10">
                <span className="text-3xl mb-2 block">{banners[currentBanner].emoji}</span>
                <h2 className="font-display text-xl md:text-3xl font-bold mb-1">{banners[currentBanner].title}</h2>
                <p className="text-xs md:text-sm opacity-90 mb-3">{banners[currentBanner].subtitle}</p>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1 text-xs font-medium bg-card/20 backdrop-blur-sm rounded-full px-3 py-1.5 hover:bg-card/30 transition-colors"
                >
                  Ko'proq <ChevronRight size={14} />
                </Link>
              </div>
              <div className="absolute right-0 top-0 w-1/3 h-full opacity-10">
                <div className="w-full h-full bg-card rounded-full scale-150 translate-x-1/4" />
              </div>
            </motion.div>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentBanner(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentBanner ? "bg-card w-5" : "bg-card/50"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Categories - circular icons with scroll */}
        <div className="px-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${
                !selectedCategory ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-secondary"
              }`}>
                🏪
              </div>
              <span className={`text-[10px] font-medium ${!selectedCategory ? "text-primary" : "text-muted-foreground"}`}>
                Barchasi
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${
                  selectedCategory === cat.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-secondary"
                }`}>
                  {cat.icon}
                </div>
                <span className={`text-[10px] font-medium max-w-[56px] truncate ${
                  selectedCategory === cat.id ? "text-primary" : "text-muted-foreground"
                }`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Flash Sale / Discounted Products */}
        {discountedProducts.length > 0 && (
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-destructive" />
                <h2 className="font-display font-bold text-base">Chegirmalar</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>5 kun qoldi</span>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {discountedProducts.map((product, i) => (
                <div key={product.id} className="flex-shrink-0 w-[140px]">
                  <ProductCard product={product} index={i} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-base">Mahsulotlar</h2>
            <span className="text-xs text-muted-foreground">{filtered.length} ta</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="aspect-square bg-secondary animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-secondary rounded animate-pulse" />
                    <div className="h-3 bg-secondary rounded w-2/3 animate-pulse" />
                    <div className="h-8 bg-secondary rounded-xl animate-pulse mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Mahsulot topilmadi</p>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;

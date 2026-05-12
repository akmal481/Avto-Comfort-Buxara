import { useState, useEffect, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { fetchProducts, fetchCategories, DbProduct, DbCategory } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([p, c]) => { setProducts(p); setCategories(c); })
      .catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !query || p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase());
      const matchCategory = !selectedCategory || p.category_id === selectedCategory;
      const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      return matchSearch && matchCategory && matchPrice;
    });
  }, [query, selectedCategory, priceRange, products]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mahsulot qidirish..." autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={16} /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl transition-colors ${showFilters ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-4 animate-fade-in">
            <div>
              <h3 className="text-sm font-medium mb-2">Kategoriya</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  Barchasi
                </button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Narx oralig'i</h3>
              <input type="range" min={0} max={2000000} step={50000} value={priceRange[1]}
                onChange={(e) => setPriceRange([0, Number(e.target.value)])} className="w-full accent-primary" />
              <p className="text-xs text-muted-foreground mt-1">0 — {priceRange[1].toLocaleString()} so'm</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
        {filtered.length === 0 && <div className="text-center py-16"><p className="text-muted-foreground">Hech narsa topilmadi 🔍</p></div>}
      </main>
      <BottomNav />
    </div>
  );
};

export default SearchPage;

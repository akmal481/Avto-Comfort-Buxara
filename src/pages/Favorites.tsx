import { useState, useEffect } from "react";
import { fetchProducts, DbProduct } from "@/lib/api";
import { useFavorites } from "@/contexts/FavoritesContext";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Favorites = () => {
  const { favorites } = useFavorites();
  const [products, setProducts] = useState<DbProduct[]>([]);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(console.error);
  }, []);

  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-4">
        <h1 className="font-display text-xl font-bold mb-4">Sevimlilar</h1>
        {favoriteProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {favoriteProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">Sevimli mahsulotlar yo'q</p>
            <Link to="/" className="text-primary font-medium text-sm">Xarid qilishni boshlang</Link>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Favorites;

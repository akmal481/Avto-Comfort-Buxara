import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchProducts, fetchCategories, formatPrice, DbProduct, DbCategory } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { ArrowLeft, Heart, ShoppingCart, Star, Truck, Shield, Minus, Plus, Share2, MessageCircle, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import ProductReviews from "@/components/ProductReviews";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [product, setProduct] = useState<DbProduct | null>(null);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c] = await Promise.all([fetchProducts(), fetchCategories()]);
        setProducts(p);
        setCategories(c);
        const found = p.find((pr) => pr.id === id);
        setProduct(found || null);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
    setSelectedImage(0);
    setQuantity(1);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-4"><div className="animate-pulse-soft text-center py-20">Yuklanmoqda...</div></div>
        <BottomNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Mahsulot topilmadi</p>
          <Link to="/" className="text-primary font-medium">Bosh sahifaga</Link>
        </div>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.category_id);
  const fav = isFavorite(product.id);
  const relatedProducts = products.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 4);
  const images = product.images.length > 0 ? product.images : ["/placeholder.svg"];

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({ id: product.id, name: product.name, price: product.price, image: images[0] });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />

      {/* Zoom overlay */}
      <AnimatePresence>
        {zoomed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomed(false)}>
            <motion.img initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}
              src={images[selectedImage]} alt={product.name} className="max-w-full max-h-full object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container py-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} /> Ortga
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image gallery */}
          <div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="relative aspect-square rounded-2xl overflow-hidden bg-secondary cursor-zoom-in"
              onClick={() => setZoomed(true)}>
              <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <ZoomIn size={16} className="text-muted-foreground" />
              </button>
              {product.old_price && (
                <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full">
                  -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}%
                </span>
              )}
            </motion.div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {category && (
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {category.icon} {category.name}
              </span>
            )}
            <h1 className="font-display text-2xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-warning text-warning" />
                <span className="font-medium text-sm">{product.rating}</span>
              </div>
              <span className="text-muted-foreground text-sm">({product.reviews_count} ta sharh)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${product.in_stock ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {product.in_stock ? "Mavjud" : "Tugagan"}
              </span>
            </div>

            <div className="flex items-end gap-3">
              <span className="font-display text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              {product.old_price && (
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.old_price)}</span>
              )}
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>

            <div className="grid grid-cols-2 gap-3 py-4">
              {[
                { icon: Truck, label: "Butun O'zbekiston bo'ylab yetkazib berish" },
                { icon: Shield, label: "Kafolat" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-secondary text-center">
                  <Icon size={20} className="text-primary" />
                  <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Miqdor:</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted"><Minus size={14} /></button>
                <span className="font-medium w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted"><Plus size={14} /></button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium py-3.5 rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]">
                <ShoppingCart size={18} /> Savatga qo'shish
              </button>
              <button onClick={() => toggleFavorite(product.id)}
                className={`p-3.5 rounded-xl border transition-all active:scale-90 ${fav ? "bg-destructive/10 border-destructive/30 text-destructive" : "border-border text-muted-foreground"}`}>
                <Heart size={20} fill={fav ? "currentColor" : "none"} />
              </button>
              <button onClick={handleShare} className="p-3.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary">
                <Share2 size={20} />
              </button>
            </div>

            {/* Quick contact */}
            <div className="flex gap-2 pt-2">
              <a href="https://t.me/+998934590065" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-info/10 text-info font-medium text-sm">
                <MessageCircle size={16} /> Telegram
              </a>
              <a href="https://wa.me/998934590065" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 text-success font-medium text-sm">
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </motion.div>
        </div>

        {/* Reviews */}
        <div className="mt-12">
          <ProductReviews productId={product.id} />
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display font-bold text-lg mb-4">O'xshash mahsulotlar</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {relatedProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default ProductDetail;

import { Heart, ShoppingCart, Star } from "lucide-react";
import { DbProduct, formatPrice } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: DbProduct;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const fav = isFavorite(product.id);

  const cartProduct = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images[0] || "/placeholder.svg",
  };

  const discount = product.old_price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-secondary">
        <img
          src={product.images[0] || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg">
            -{discount}%
          </span>
        )}
        {/* Favorite button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all active:scale-90 ${
            fav ? "bg-destructive/15 text-destructive" : "bg-card/70 backdrop-blur-sm text-muted-foreground"
          }`}
        >
          <Heart size={16} fill={fav ? "currentColor" : "none"} />
        </button>
        {/* Out of stock */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-xs font-medium bg-card px-3 py-1 rounded-full">Sotuvda yo'q</span>
          </div>
        )}
      </Link>

      <div className="p-2.5">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-xs font-medium line-clamp-2 mb-1.5 min-h-[32px] group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <Star size={10} className="fill-warning text-warning" />
            <span className="text-[10px] text-muted-foreground">
              {product.rating} ({product.reviews_count})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="mb-2">
          <span className="font-display font-bold text-sm block">{formatPrice(product.price)}</span>
          {product.old_price && (
            <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.old_price)}</span>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={() => addToCart(cartProduct)}
          disabled={!product.in_stock}
          className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium py-2.5 rounded-xl hover:opacity-90 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={14} />
          Savatga
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;

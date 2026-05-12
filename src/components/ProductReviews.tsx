import { useState, useEffect } from "react";
import { Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profile?: { display_name: string | null };
}

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch profile names
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const enriched = data.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || { display_name: null },
      }));

      setReviews(enriched);
      if (user) {
        const existing = enriched.find(r => r.user_id === user.id);
        setUserReview(existing || null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;

    setSubmitting(true);
    try {
      if (userReview) {
        await supabase
          .from("reviews")
          .update({ rating, comment: comment.trim() })
          .eq("id", userReview.id);
      } else {
        await supabase
          .from("reviews")
          .insert({ product_id: productId, user_id: user.id, rating, comment: comment.trim() });
      }
      setComment("");
      await fetchReviews();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percent: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg">Sharhlar ({reviews.length})</h2>

      {/* Rating summary */}
      {reviews.length > 0 && (
        <div className="flex gap-6 p-4 bg-card rounded-2xl border border-border">
          <div className="text-center">
            <div className="font-display text-4xl font-bold text-primary">{avgRating}</div>
            <div className="flex gap-0.5 justify-center mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={12} className={s <= Math.round(Number(avgRating)) ? "fill-warning text-warning" : "text-muted"} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{reviews.length} ta sharh</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {ratingCounts.map(({ star, count, percent }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs w-3 text-muted-foreground">{star}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full bg-warning rounded-full"
                  />
                </div>
                <span className="text-xs w-5 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write review form */}
      {user ? (
        <form onSubmit={handleSubmit} className="p-4 bg-card rounded-2xl border border-border space-y-3">
          <p className="text-sm font-medium">{userReview ? "Sharhingizni o'zgartiring" : "Sharh yozing"}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  size={24}
                  className={`transition-colors ${
                    s <= (hoverRating || rating) ? "fill-warning text-warning" : "text-muted"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Fikringizni yozing..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Send size={14} />
            {submitting ? "Yuborilmoqda..." : userReview ? "Yangilash" : "Yuborish"}
          </button>
        </form>
      ) : (
        <div className="p-4 bg-card rounded-2xl border border-border text-center">
          <p className="text-sm text-muted-foreground mb-2">Sharh qoldirish uchun tizimga kiring</p>
          <Link to="/auth" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Kirish →
          </Link>
        </div>
      )}

      {/* Reviews list */}
      <AnimatePresence>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="p-4 bg-card rounded-2xl border border-border animate-pulse">
                <div className="h-3 bg-secondary rounded w-1/3 mb-2" />
                <div className="h-3 bg-secondary rounded w-full" />
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-card rounded-2xl border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {(review.profile?.display_name || "F")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{review.profile?.display_name || "Foydalanuvchi"}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={10} className={s <= review.rating ? "fill-warning text-warning" : "text-muted"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("uz")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">Hali sharhlar yo'q</p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductReviews;

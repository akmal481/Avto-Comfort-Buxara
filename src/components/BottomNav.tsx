import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, Zap, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", icon: Home, label: "Bosh sahifa" },
  { path: "/search", icon: LayoutGrid, label: "Katalog" },
  { path: "/cart", icon: ShoppingCart, label: "Savat" },
  { path: "/checkout", icon: Zap, label: "Buyurtma" },
  { path: "/settings", icon: User, label: "Profil" },
];

const BottomNav = () => {
  const location = useLocation();
  const { totalItems } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-1.5 px-1">
        {navItems.map((item) => {
          const isActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-0.5 py-1 px-2 min-w-[56px]"
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="bottomNavBg"
                    className="absolute inset-0 -m-1.5 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  className={`relative z-10 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {item.path === "/cart" && totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 z-20"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

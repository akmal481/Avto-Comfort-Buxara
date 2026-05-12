import { Link, useLocation } from "react-router-dom";
import { Heart, Search, MapPin, Moon, Sun, Globe } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";

const Header = () => {
  const location = useLocation();
  const { favorites } = useFavorites();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (location.pathname === "/search") return null;

  const langFlags: Record<string, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1.5">
            <MapPin size={16} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Buxoro</span>
          </div>
          <Link to="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-[10px]">AC</span>
            </div>
            <span className="font-display font-bold text-sm">Avto Comfort</span>
          </Link>
          <div className="flex items-center gap-1">
            {/* Dark/Light toggle */}
            <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-muted-foreground" />}
            </button>
            {/* Language */}
            <div className="relative" ref={langRef}>
              <button onClick={() => setLangOpen(!langOpen)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-sm">
                {langFlags[lang]}
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[120px] py-1">
                  {(["uz", "ru", "en"] as const).map((l) => (
                    <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${lang === l ? "text-primary font-medium" : "text-foreground"}`}>
                      {langFlags[l]} {l === "uz" ? "O'zbek" : l === "ru" ? "Русский" : "English"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to="/favorites" className="relative p-1.5">
              <Heart size={20} className="text-muted-foreground" />
              {favorites.length > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {favorites.length}
                </motion.span>
              )}
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3">
          <Link to="/search"
            className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm">
            <Search size={16} />
            <span>{t("search_placeholder")}</span>
          </Link>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between h-16 container">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">AC</span>
          </div>
          <span className="font-display font-bold text-lg">Avto Comfort</span>
        </Link>
        <nav className="flex items-center gap-6">
          {[
            { path: "/", label: t("home") },
            { path: "/search", label: t("catalog") },
            { path: "/contact", label: t("contact") },
          ].map((link) => (
            <Link key={link.path} to={link.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.path ? "text-primary" : "text-muted-foreground"
              }`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* Dark/Light */}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            {theme === "dark" ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-muted-foreground" />}
          </button>
          {/* Language */}
          <div className="relative" ref={langRef}>
            <button onClick={() => setLangOpen(!langOpen)} className="p-2 rounded-lg hover:bg-secondary transition-colors flex items-center gap-1 text-sm">
              {langFlags[lang]} <Globe size={16} className="text-muted-foreground" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[140px] py-1">
                {(["uz", "ru", "en"] as const).map((l) => (
                  <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors ${lang === l ? "text-primary font-medium" : "text-foreground"}`}>
                    {langFlags[l]} {l === "uz" ? "O'zbek" : l === "ru" ? "Русский" : "English"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link to="/search" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Search size={20} className="text-muted-foreground" />
          </Link>
          <Link to="/favorites" className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <Heart size={20} className="text-muted-foreground" />
            {favorites.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </Link>
          <Link to="/cart" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <span className="text-sm font-medium text-muted-foreground">{t("cart")}</span>
          </Link>
          <Link to="/settings" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <span className="text-sm font-medium text-muted-foreground">{t("profile")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

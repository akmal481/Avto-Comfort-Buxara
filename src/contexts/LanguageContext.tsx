import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Lang = "uz" | "ru" | "en";

const translations: Record<string, Record<Lang, string>> = {
  search_placeholder: { uz: "Mahsulotlar va turkumlar qidirish", ru: "Поиск товаров и категорий", en: "Search products and categories" },
  favorites: { uz: "Sevimlilar", ru: "Избранное", en: "Favorites" },
  cart: { uz: "Savat", ru: "Корзина", en: "Cart" },
  home: { uz: "Bosh sahifa", ru: "Главная", en: "Home" },
  catalog: { uz: "Katalog", ru: "Каталог", en: "Catalog" },
  contact: { uz: "Bog'lanish", ru: "Контакты", en: "Contact" },
  profile: { uz: "Profil", ru: "Профиль", en: "Profile" },
  settings: { uz: "Sozlamalar", ru: "Настройки", en: "Settings" },
  orders: { uz: "Buyurtmalarim", ru: "Мои заказы", en: "My Orders" },
  language: { uz: "Til", ru: "Язык", en: "Language" },
  theme: { uz: "Tema", ru: "Тема", en: "Theme" },
  notifications: { uz: "Bildirishnomalar", ru: "Уведомления", en: "Notifications" },
  add_to_cart: { uz: "Savatga qo'shish", ru: "В корзину", en: "Add to cart" },
  buy_now: { uz: "Sotib olish", ru: "Купить", en: "Buy now" },
  delivery: { uz: "Butun O'zbekiston bo'ylab yetkazib berish", ru: "Доставка по всему Узбекистану", en: "Delivery across Uzbekistan" },
  warranty: { uz: "Kafolat", ru: "Гарантия", en: "Warranty" },
  in_stock: { uz: "Mavjud", ru: "В наличии", en: "In stock" },
  out_of_stock: { uz: "Tugagan", ru: "Нет в наличии", en: "Out of stock" },
  similar_products: { uz: "O'xshash mahsulotlar", ru: "Похожие товары", en: "Similar products" },
  login: { uz: "Kirish", ru: "Войти", en: "Login" },
  register: { uz: "Ro'yxatdan o'tish", ru: "Регистрация", en: "Register" },
  sign_out: { uz: "Chiqish", ru: "Выйти", en: "Sign out" },
  admin_panel: { uz: "Admin panel", ru: "Админ панель", en: "Admin Panel" },
  light: { uz: "Yorug'", ru: "Светлая", en: "Light" },
  dark: { uz: "Qorong'u", ru: "Тёмная", en: "Dark" },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("ac-lang");
    return (saved === "uz" || saved === "ru" || saved === "en") ? saved : "uz";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("ac-lang", l);
  }, []);

  const t = useCallback((key: string) => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};

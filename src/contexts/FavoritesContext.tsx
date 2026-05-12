import React, { createContext, useContext, useState, useCallback } from "react";
import { logActivity } from "@/hooks/useActivityLogger";

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      if (!exists) logActivity("favorite_add", { product_id: productId });
      return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
    });
  }, []);

  const isFavorite = useCallback((productId: string) => favorites.includes(productId), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within FavoritesProvider");
  return context;
};

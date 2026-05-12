import React, { createContext, useContext, useState, useCallback } from "react";
import { CartItem } from "./CartContext";

export type OrderStatus = "accepted" | "preparing" | "shipping" | "delivered";

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  createdAt: Date;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "status" | "createdAt">) => string;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = useCallback((orderData: Omit<Order, "id" | "status" | "createdAt">) => {
    const id = "ORD-" + Date.now().toString(36).toUpperCase();
    const newOrder: Order = {
      ...orderData,
      id,
      status: "accepted",
      createdAt: new Date(),
    };
    setOrders((prev) => [newOrder, ...prev]);
    return id;
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  }, []);

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used within OrderProvider");
  return context;
};

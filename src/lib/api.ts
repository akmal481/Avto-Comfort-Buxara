import { supabase } from "@/integrations/supabase/client";

export interface DbProduct {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  description: string;
  category_id: string | null;
  images: string[];
  rating: number;
  reviews_count: number;
  in_stock: boolean;
  qr_code: string | null;
  created_at: string;
}

// Find product by QR code
export const findProductByQR = async (qrCode: string) => {
  // Try direct qr_code match
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("qr_code", qrCode)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as DbProduct;

  // Try matching by product ID (QR might contain URL or ID)
  const idMatch = qrCode.match(/product\/([a-f0-9-]+)/i) || qrCode.match(/^([a-f0-9-]{36})$/i);
  if (idMatch) {
    const { data: byId } = await supabase.from("products").select("*").eq("id", idMatch[1]).maybeSingle();
    if (byId) return byId as DbProduct;
  }

  return null;
};

export interface DbCategory {
  id: string;
  name: string;
  icon: string;
}

export interface DbOrder {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  total: number;
  created_at: string;
  moved_to_sold: boolean;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
}

// Products
export const fetchProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as DbProduct[];
};

export const createProduct = async (product: Omit<DbProduct, "id" | "created_at" | "rating" | "reviews_count">) => {
  const { data, error } = await supabase.from("products").insert(product).select().single();
  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: Partial<DbProduct>) => {
  const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
};

// Categories
export const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data as DbCategory[];
};

export const createCategory = async (cat: { name: string; icon: string }) => {
  const { data, error } = await supabase.from("categories").insert(cat).select().single();
  if (error) throw error;
  return data;
};

export const updateCategory = async (id: string, updates: { name?: string; icon?: string }) => {
  const { data, error } = await supabase.from("categories").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteCategory = async (id: string) => {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
};

// Orders
export const fetchOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as DbOrder[];
};

export const fetchOrderItems = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (error) throw error;
  return data as DbOrderItem[];
};

export const createOrder = async (order: {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  user_id?: string | null;
}) => {
  const { data, error } = await supabase.from("orders").insert(order).select().single();
  if (error) throw error;
  return data;
};

export const createOrderItems = async (items: {
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
}[]) => {
  const { error } = await supabase.from("order_items").insert(items);
  if (error) throw error;
};

export const updateOrderStatus = async (id: string, status: string) => {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
};

export const deleteOrder = async (id: string) => {
  // order_items cascade via FK
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
};

// Image upload
export const uploadProductImage = async (file: File) => {
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(data.path);
  return urlData.publicUrl;
};

export const formatPrice = (price: number): string => {
  return price.toLocaleString("uz-UZ") + " so'm";
};

// Sold items
export interface DbSoldItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  product_image: string;
  quantity: number;
  total: number;
  sold_at: string;
  archived: boolean;
  archived_at: string | null;
}

export const fetchSoldItems = async () => {
  const { data, error } = await supabase.from("sold_items").select("*").order("sold_at", { ascending: false });
  if (error) throw error;
  return (data || []) as DbSoldItem[];
};

export const archiveSoldItem = async (id: string) => {
  const { error } = await supabase.from("sold_items").update({ archived: true, archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
};

export const unarchiveSoldItem = async (id: string) => {
  const { error } = await supabase.from("sold_items").update({ archived: false, archived_at: null }).eq("id", id);
  if (error) throw error;
};

export const deleteSoldItemPermanently = async (id: string) => {
  const { error } = await supabase.from("sold_items").delete().eq("id", id);
  if (error) throw error;
};

export const moveOrderToSold = async (order: DbOrder, items: DbOrderItem[], products: DbProduct[]) => {
  const soldEntries = items.map((item) => {
    const prod = products.find((p) => p.id === item.product_id);
    return {
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      product_image: prod?.images?.[0] || "",
      quantity: item.quantity,
      total: item.product_price * item.quantity,
    };
  });
  const { error: insertErr } = await supabase.from("sold_items").insert(soldEntries);
  if (insertErr) throw insertErr;

  // Mark order as moved
  const { error: updateErr } = await supabase.from("orders").update({ moved_to_sold: true }).eq("id", order.id);
  if (updateErr) throw updateErr;

  // Decrease stock - not removing product, just marking out of stock if needed
  // We don't have a stock_count column, so we skip stock decrement for now
};

export const returnSoldItem = async (soldItem: DbSoldItem) => {
  const { error } = await supabase.from("sold_items").delete().eq("id", soldItem.id);
  if (error) throw error;

  // Check if any sold items remain for this order
  const { data: remaining } = await supabase.from("sold_items").select("id").eq("order_id", soldItem.order_id);
  if (!remaining || remaining.length === 0) {
    await supabase.from("orders").update({ moved_to_sold: false }).eq("id", soldItem.order_id);
  }
};

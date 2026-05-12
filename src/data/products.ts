export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  description: string;
  category: string;
  images: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const categories: Category[] = [
  { id: "1", name: "Avtomobil uchun", icon: "🚗" },
  { id: "2", name: "Uy uchun", icon: "🏠" },
  { id: "3", name: "Aksessuarlar", icon: "🎒" },
  { id: "4", name: "Elektronika", icon: "📱" },
  { id: "5", name: "O'yinchoqlar", icon: "🧸" },
];

export const products: Product[] = [
  {
    id: "1",
    name: "Avtomobil o'rindiq qoplama Premium",
    price: 450000,
    oldPrice: 550000,
    description: "Yuqori sifatli charm o'rindiq qoplama. Universal o'lcham, barcha avtomobillarga mos. Suv o'tkazmaydi, oson tozalanadi.",
    category: "1",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop"],
    rating: 4.8,
    reviews: 124,
    inStock: true,
  },
  {
    id: "2",
    name: "LED ichki yoritgich",
    price: 85000,
    oldPrice: 120000,
    description: "RGB rangli LED yoritgich. Pult bilan boshqariladi. 16 xil rang. Avtomobil ichini chiroyli qiladi.",
    category: "1",
    images: ["https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=400&h=400&fit=crop"],
    rating: 4.5,
    reviews: 89,
    inStock: true,
  },
  {
    id: "3",
    name: "Avtomobil hid beruvchi",
    price: 35000,
    description: "Premium parfyum hidi. 3 oy davom etadi. Elegant dizayn.",
    category: "3",
    images: ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop"],
    rating: 4.3,
    reviews: 56,
    inStock: true,
  },
  {
    id: "4",
    name: "Telefon ushlagich magnit",
    price: 65000,
    oldPrice: 80000,
    description: "360° aylanuvchi magnit ushlagich. Kuchli magnit. Barcha telefonlarga mos.",
    category: "3",
    images: ["https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop"],
    rating: 4.7,
    reviews: 203,
    inStock: true,
  },
  {
    id: "5",
    name: "Dashcam 4K",
    price: 890000,
    oldPrice: 1200000,
    description: "4K sifatli video yozuvchi. Tungi ko'rish. GPS. G-sensor. Loop yozuv.",
    category: "4",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop"],
    rating: 4.9,
    reviews: 312,
    inStock: true,
  },
  {
    id: "6",
    name: "Avtomobil changyutgich",
    price: 180000,
    description: "Mini simsiz changyutgich. Kuchli so'rish quvvati. Kompakt dizayn.",
    category: "1",
    images: ["https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop"],
    rating: 4.4,
    reviews: 78,
    inStock: true,
  },
  {
    id: "7",
    name: "Uy uchun xushbo'y mum",
    price: 45000,
    description: "Tabiiy soy mum. Lavanda hidi. 40 soat yonadi.",
    category: "2",
    images: ["https://images.unsplash.com/photo-1602607700009-f6dd4ddddd27?w=400&h=400&fit=crop"],
    rating: 4.6,
    reviews: 145,
    inStock: true,
  },
  {
    id: "8",
    name: "Smart soat bolalar uchun",
    price: 320000,
    oldPrice: 400000,
    description: "GPS tracker. SOS tugma. Ikki tomonlama qo'ng'iroq. Suv o'tkazmaydi.",
    category: "4",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"],
    rating: 4.2,
    reviews: 67,
    inStock: true,
  },
  {
    id: "9",
    name: "Plush ayiqcha katta",
    price: 150000,
    description: "Yumshoq plush ayiqcha. 80cm balandlik. Bolalar uchun xavfsiz material.",
    category: "5",
    images: ["https://images.unsplash.com/photo-1559715541-5daf8a0296d0?w=400&h=400&fit=crop"],
    rating: 4.8,
    reviews: 234,
    inStock: true,
  },
  {
    id: "10",
    name: "Uy dekoratsiya guli sun'iy",
    price: 75000,
    description: "Premium sun'iy gul. Tabiiyga o'xshash. Uzoq muddat xizmat qiladi.",
    category: "2",
    images: ["https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=400&fit=crop"],
    rating: 4.5,
    reviews: 91,
    inStock: true,
  },
  {
    id: "11",
    name: "Bluetooth kolonka mini",
    price: 195000,
    oldPrice: 250000,
    description: "Portativ Bluetooth kolonka. 10 soat batareya. Suv o'tkazmaydi. Bass boost.",
    category: "4",
    images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop"],
    rating: 4.6,
    reviews: 178,
    inStock: true,
  },
  {
    id: "12",
    name: "Avtomobil gilam to'plam",
    price: 280000,
    description: "Universal gilam to'plam. Rezina taglik. Oson tozalanadi. 4 dona.",
    category: "1",
    images: ["https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=400&fit=crop"],
    rating: 4.3,
    reviews: 52,
    inStock: true,
  },
];

export const formatPrice = (price: number): string => {
  return price.toLocaleString("uz-UZ") + " so'm";
};

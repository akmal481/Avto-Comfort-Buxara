import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Loader2, Package } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { DbOrder, DbOrderItem, fetchOrderItems, formatPrice } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  accepted: "Qabul qilindi",
  preparing: "Yig'ilmoqda",
  shipping: "Yo'lda",
  delivered: "Yetkazildi",
};

interface Props {
  order: DbOrder;
  onClose: () => void;
}

const OrderReceipt = ({ order, onClose }: Props) => {
  const [items, setItems] = useState<DbOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderItems(order.id)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [order.id]);

  const subtotal = items.reduce((s, i) => s + i.product_price * i.quantity, 0);
  const delivery = Math.max(0, order.total - subtotal);
  const date = new Date(order.created_at).toLocaleString("uz-UZ", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const downloadPdf = () => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a5" });
      const w = doc.internal.pageSize.getWidth();
      let y = 14;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("AVTO COMFORT BUXARA", w / 2, y, { align: "center" });
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Chek / Receipt", w / 2, y, { align: "center" });
      y += 8;
      doc.setLineWidth(0.2);
      doc.line(10, y, w - 10, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Buyurtma: ${order.order_number}`, 10, y); y += 5;
      doc.text(`Sana: ${date}`, 10, y); y += 5;
      doc.text(`Mijoz: ${order.customer_name}`, 10, y); y += 5;
      doc.text(`Telefon: ${order.customer_phone}`, 10, y); y += 5;
      const addr = doc.splitTextToSize(`Manzil: ${order.customer_address}`, w - 20);
      doc.text(addr, 10, y); y += addr.length * 5;
      doc.text(`Status: ${statusLabels[order.status] || order.status}`, 10, y); y += 5;
      doc.line(10, y, w - 10, y); y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Mahsulotlar:", 10, y); y += 5;
      doc.setFont("helvetica", "normal");
      items.forEach((it) => {
        const name = doc.splitTextToSize(`• ${it.product_name}`, w - 60);
        doc.text(name, 10, y);
        doc.text(`${it.quantity} x ${it.product_price.toLocaleString("uz-UZ")}`, w - 10, y, { align: "right" });
        y += name.length * 5;
        doc.text(`= ${(it.quantity * it.product_price).toLocaleString("uz-UZ")} so'm`, w - 10, y, { align: "right" });
        y += 5;
      });
      doc.line(10, y, w - 10, y); y += 6;
      doc.text(`Mahsulotlar:`, 10, y); doc.text(`${subtotal.toLocaleString("uz-UZ")} so'm`, w - 10, y, { align: "right" }); y += 5;
      doc.text(`Yetkazib berish:`, 10, y); doc.text(`${delivery.toLocaleString("uz-UZ")} so'm`, w - 10, y, { align: "right" }); y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`JAMI:`, 10, y); doc.text(`${order.total.toLocaleString("uz-UZ")} so'm`, w - 10, y, { align: "right" }); y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Xaridingiz uchun rahmat!", w / 2, y, { align: "center" });
      doc.save(`chek-${order.order_number}.pdf`);
      toast({ title: "Chek yuklandi ✅" });
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-5 py-3.5 flex items-center justify-between z-10">
          <h3 className="font-display font-bold text-base">Chek</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Receipt header */}
          <div className="text-center mb-4 pb-4 border-b border-dashed border-border">
            <h2 className="font-display font-bold text-lg">AVTO COMFORT</h2>
            <p className="text-xs text-muted-foreground">Buxoro avto qismlar do'koni</p>
          </div>

          {/* Order info */}
          <div className="space-y-2 text-sm mb-4">
            <Row label="Buyurtma" value={<span className="font-mono font-bold">{order.order_number}</span>} />
            <Row label="Sana" value={date} />
            <Row label="Mijoz" value={order.customer_name} />
            <Row label="Telefon" value={order.customer_phone} />
            <Row label="Manzil" value={<span className="text-right max-w-[60%]">{order.customer_address}</span>} />
            <Row label="Status" value={
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                order.status === "delivered" ? "bg-green-500/15 text-green-600" :
                order.status === "shipping" ? "bg-blue-500/15 text-blue-600" :
                "bg-amber-500/15 text-amber-600"
              }`}>{statusLabels[order.status]}</span>
            } />
          </div>

          {/* Items */}
          <div className="border-t border-dashed border-border pt-3 mb-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">MAHSULOTLAR</div>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Mahsulotlar topilmadi</p>
            ) : (
              <div className="space-y-2.5">
                {items.map((it) => (
                  <div key={it.id} className="flex items-start gap-2 text-sm">
                    <Package size={14} className="mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.product_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.quantity} x {formatPrice(it.product_price)}
                      </div>
                    </div>
                    <div className="font-semibold text-sm whitespace-nowrap">
                      {formatPrice(it.quantity * it.product_price)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-border pt-3 space-y-1.5 text-sm">
            <Row label="Mahsulotlar" value={formatPrice(subtotal)} />
            {delivery > 0 && <Row label="Yetkazib berish" value={formatPrice(delivery)} />}
            <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
              <span className="font-display font-bold">JAMI</span>
              <span className="font-display font-bold text-lg text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center mt-5 pt-4 border-t border-dashed border-border">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={`${window.location.origin}/order/${order.order_number}`} size={100} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Chekni tekshirish</p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">Xaridingiz uchun rahmat! 💚</p>

          {/* Actions */}
          <button
            onClick={downloadPdf}
            className="w-full mt-5 bg-primary text-primary-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> PDF yuklab olish
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default OrderReceipt;

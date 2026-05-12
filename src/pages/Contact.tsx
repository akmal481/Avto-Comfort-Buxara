import { Phone, MapPin, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const contacts = [
  { name: "Maruf", phone: "+998934590065" },
  { name: "Anvar", phone: "+998939600438" },
  { name: "Umid", phone: "+998936517555" },
];

const Contact = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-4 max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-6">Bog'lanish</h1>

          {/* Phone numbers */}
          <div className="space-y-2 mb-6">
            <h2 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Telefonlar</h2>
            {contacts.map((c) => (
              <a
                key={c.phone}
                href={`tel:${c.phone}`}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card border border-border hover:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Quick Contact */}
          <div className="space-y-2 mb-6">
            <h2 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Tez aloqa</h2>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://t.me/+998934590065"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-info/10 text-info font-medium text-sm hover:bg-info/20 transition-colors"
              >
                <MessageCircle size={18} />
                Telegram
              </a>
              <a
                href="https://wa.me/998934590065"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 text-success font-medium text-sm hover:bg-success/20 transition-colors"
              >
                <MessageCircle size={18} />
                WhatsApp
              </a>
            </div>
          </div>

          {/* Instagram */}
          <div className="mb-6">
            <h2 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Ijtimoiy tarmoq</h2>
            <a
              href="https://www.instagram.com/avto_comfort_buxara?igsh=bW9xY21mZnpsd3I4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card border border-border hover:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning to-destructive flex items-center justify-center">
                <span className="text-lg">📸</span>
              </div>
              <div>
                <p className="text-sm font-medium">Instagram</p>
                <p className="text-xs text-muted-foreground">@avto_comfort_buxara</p>
              </div>
            </a>
          </div>

          {/* Location */}
          <div>
            <h2 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Lokatsiya</h2>
            <a
              href="https://yandex.uz/maps/org/109758486713/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-secondary relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=300&fit=crop"
                  alt="Avto Comfort lokatsiyasi"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-3 left-3 text-card">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={16} />
                    <span className="text-sm font-medium">Buxoro, O'zbekiston</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-card">
                <p className="text-xs text-muted-foreground">Xaritada ochish uchun bosing →</p>
              </div>
            </a>
          </div>
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Contact;

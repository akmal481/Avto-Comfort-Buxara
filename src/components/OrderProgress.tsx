import { motion } from "framer-motion";
import { OrderStatus } from "@/contexts/OrderContext";
import { Package, Truck, CheckCircle, Clock } from "lucide-react";

const steps: { key: OrderStatus; label: string; icon: React.ElementType }[] = [
  { key: "accepted", label: "Qabul qilindi", icon: Clock },
  { key: "preparing", label: "Yig'ilmoqda", icon: Package },
  { key: "shipping", label: "Yo'lda", icon: Truck },
  { key: "delivered", label: "Yetkazildi", icon: CheckCircle },
];

const statusIndex = (status: OrderStatus) => steps.findIndex((s) => s.key === status);

const OrderProgress = ({ status }: { status: OrderStatus }) => {
  const current = statusIndex(status);

  return (
    <div className="flex items-center justify-between w-full py-4">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isCompleted = i <= current;
        const isActive = i === current;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {i > 0 && (
              <div className="absolute top-5 right-1/2 w-full h-0.5 -z-10">
                <div className="w-full h-full bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: i <= current ? "100%" : "0%" }}
                    transition={{ duration: 0.6, delay: i * 0.2 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 300 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-colors ${
                isCompleted
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              } ${isActive ? "ring-4 ring-primary/20" : ""}`}
            >
              <Icon size={18} />
            </motion.div>
            <span className={`text-[10px] sm:text-xs font-medium text-center ${isCompleted ? "text-primary" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OrderProgress;

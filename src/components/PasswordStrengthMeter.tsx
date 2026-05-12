import { motion } from "framer-motion";
import { passwordStrength } from "@/lib/passwordValidation";

const labels = { weak: "Zaif", medium: "O'rtacha", strong: "Kuchli" } as const;
const colors = { weak: "bg-destructive", medium: "bg-amber-500", strong: "bg-green-500" } as const;
const widths = { weak: "33%", medium: "66%", strong: "100%" } as const;

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  if (!password) return null;
  const s = passwordStrength(password);
  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colors[s]}`}
          initial={{ width: 0 }}
          animate={{ width: widths[s] }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className={`text-xs font-medium ${s === "weak" ? "text-destructive" : s === "medium" ? "text-amber-600" : "text-green-600"}`}>
        Parol kuchi: {labels[s]}
      </p>
    </div>
  );
};
export default PasswordStrengthMeter;

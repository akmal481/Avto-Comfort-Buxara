import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  showIcon?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, Props>(({ showIcon = true, className = "", ...rest }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {showIcon && (
        <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      )}
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        className={`w-full ${showIcon ? "pl-11" : "pl-4"} pr-11 py-3.5 rounded-xl bg-secondary text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={visible ? "Yashirish" : "Ko'rsatish"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
export default PasswordInput;

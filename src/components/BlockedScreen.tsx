import { Ban } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const BlockedScreen = ({ reason }: { reason?: string | null }) => {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-5 bg-card border border-border rounded-2xl p-8 shadow-lg">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <Ban size={32} />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-2">Akkaunt bloklangan</h1>
          <p className="text-sm text-muted-foreground">
            {reason || "Sizning akkauntingiz administrator tomonidan vaqtincha bloklangan. Iltimos, qo'llab-quvvatlash xizmatiga murojaat qiling."}
          </p>
        </div>
        <button
          onClick={signOut}
          className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
        >
          Chiqish
        </button>
      </div>
    </div>
  );
};

export default BlockedScreen;

import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { useSharedImageImporter } from "@/hooks/useSharedImageImporter";
import OnboardingDialog from "./OnboardingDialog";

export default function AppShell({ children }: { children: ReactNode }) {
  useSharedImageImporter();
  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="max-w-md mx-auto safe-top safe-bottom">
        {children}
      </div>
      <BottomNav />
      <OnboardingDialog />
    </div>
  );
}

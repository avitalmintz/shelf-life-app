import { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="max-w-md mx-auto safe-bottom">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

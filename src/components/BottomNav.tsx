import { NavLink, useLocation } from "react-router-dom";
import { Home, Plus, Sparkles, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/",          label: "Home",      icon: Home },
  { to: "/search",    label: "Search",    icon: Search },
  { to: "/add",       label: "Add",       icon: Plus, primary: true },
  { to: "/resurface", label: "Resurface", icon: Sparkles },
  { to: "/profile",   label: "Profile",   icon: User },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="max-w-md mx-auto grid grid-cols-5 px-2 pt-2 pb-2">
        {items.map(({ to, label, icon: Icon, primary }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          if (primary) {
            return (
              <li key={to} className="flex justify-center">
                <NavLink
                  to={to}
                  aria-label={label}
                  className="-mt-7 h-14 w-14 rounded-full bg-gradient-warm shadow-pop flex items-center justify-center text-primary-foreground active:scale-95 transition"
                >
                  <Icon className="h-6 w-6" />
                </NavLink>
              </li>
            );
          }
          return (
            <li key={to} className="flex justify-center">
              <NavLink
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

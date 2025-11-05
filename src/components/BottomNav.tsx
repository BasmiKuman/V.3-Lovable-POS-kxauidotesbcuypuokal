import { Home, Package, BarChart3, Settings, ShoppingCart, Warehouse, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  isAdmin: boolean;
}

export const BottomNav = ({ isAdmin }: BottomNavProps) => {
  const location = useLocation();

  const adminNavItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Warehouse, label: "Gudang", path: "/warehouse" },
    { icon: Package, label: "Produk", path: "/products" },
    { icon: BarChart3, label: "Laporan", path: "/reports" },
    { icon: Settings, label: "Pengaturan", path: "/settings" },
  ];

  const riderNavItems = [
    { icon: ShoppingCart, label: "Kasir", path: "/pos" },
    { icon: Package, label: "Stok", path: "/products" },
    { icon: Settings, label: "Akun", path: "/settings" },
  ];

  const navItems = isAdmin ? adminNavItems : riderNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="overflow-x-auto scrollbar-none">
        <div 
          className="flex items-center justify-evenly h-16 max-w-screen-xl mx-auto"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full min-w-[4rem] max-w-[7rem] px-2 space-y-1 rounded-lg transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", isActive && "animate-fade-in")} />
                <span className="text-[0.65rem] sm:text-xs font-medium text-center leading-tight truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
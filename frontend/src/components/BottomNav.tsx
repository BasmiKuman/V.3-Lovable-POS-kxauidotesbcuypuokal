import { Home, Package, BarChart3, Settings, ShoppingCart, Warehouse, Trophy, FileText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  isAdmin: boolean;
}

export const BottomNav = ({ isAdmin }: BottomNavProps) => {
  const location = useLocation();

  const adminNavItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard", color: "primary" },
    { icon: Warehouse, label: "Gudang", path: "/warehouse", color: "secondary" },
    { icon: Package, label: "Produk", path: "/products", color: "accent" },
    { icon: BarChart3, label: "Laporan", path: "/reports", color: "purple" },
    { icon: Settings, label: "Pengaturan", path: "/settings", color: "default" },
  ];

  const riderNavItems = [
    { icon: Trophy, label: "Dashboard", path: "/rider-dashboard", color: "primary" },
    { icon: ShoppingCart, label: "Kasir", path: "/pos", color: "secondary" },
    { icon: FileText, label: "Laporan", path: "/rider-reports", color: "purple" },
    { icon: Package, label: "Stok", path: "/products", color: "accent" },
    { icon: Settings, label: "Akun", path: "/settings", color: "default" },
  ];

  const navItems = isAdmin ? adminNavItems : riderNavItems;

  const getActiveColor = (color: string) => {
    const colors = {
      primary: "text-primary bg-primary/10",
      secondary: "text-secondary bg-secondary/10",
      accent: "text-accent bg-accent/10",
      purple: "text-[hsl(270,70%,60%)] bg-[hsl(270,70%,60%)]/10",
      default: "text-primary bg-primary/10",
    };
    return colors[color as keyof typeof colors] || colors.default;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 shadow-xl backdrop-blur-xl">
      {/* Decorative top border with gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      <div className="overflow-x-auto scrollbar-none">
        <div 
          className="flex items-center justify-evenly h-16 max-w-screen-xl mx-auto"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
        >
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "group relative flex flex-col items-center justify-center flex-1 h-full min-w-[4rem] max-w-[7rem] px-2 space-y-1 transition-all duration-300",
                  "hover:scale-105 active:scale-95"
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Active indicator - floating dot */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current animate-bounce-in" />
                )}

                {/* Icon container with background */}
                <div className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                  isActive 
                    ? cn(getActiveColor(item.color), "shadow-md scale-110") 
                    : "text-muted-foreground group-hover:bg-muted/30 group-hover:text-foreground"
                )}>
                  {/* Glow effect on active */}
                  {isActive && (
                    <div className={cn(
                      "absolute inset-0 rounded-xl blur-sm opacity-50 animate-pulse-slow",
                      item.color === "primary" && "bg-primary/30",
                      item.color === "secondary" && "bg-secondary/30",
                      item.color === "accent" && "bg-accent/30",
                      item.color === "purple" && "bg-[hsl(270,70%,60%)]/30",
                      item.color === "default" && "bg-primary/30"
                    )} />
                  )}
                  
                  <Icon className={cn(
                    "w-5 h-5 relative z-10 transition-transform duration-300",
                    isActive && "animate-scale-in"
                  )} />
                </div>

                {/* Label */}
                <span className={cn(
                  "text-[0.65rem] sm:text-xs font-semibold text-center leading-tight truncate max-w-full transition-all duration-300",
                  isActive 
                    ? "text-current" 
                    : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {item.label}
                </span>

                {/* Bottom active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-current rounded-full animate-fade-in-up" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
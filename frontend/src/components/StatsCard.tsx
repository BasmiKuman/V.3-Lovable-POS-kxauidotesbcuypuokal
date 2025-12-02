import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  variant?: "default" | "primary" | "secondary" | "accent";
  onClick?: () => void;
  to?: string;
}

export const StatsCard = ({ title, value, icon: Icon, trend, className, variant = "default" }: StatsCardProps) => {
  const variantStyles = {
    default: "border-border/50 bg-card hover:shadow-md",
    primary: "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:shadow-colored hover:border-primary/50",
    secondary: "border-secondary/30 bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent hover:shadow-glow-secondary hover:border-secondary/50",
    accent: "border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent hover:shadow-glow-accent hover:border-accent/50",
  };

  const iconBgStyles = {
    default: "bg-primary/10 group-hover:bg-primary/20",
    primary: "bg-gradient-primary group-hover:scale-110",
    secondary: "bg-gradient-secondary group-hover:scale-110",
    accent: "bg-gradient-accent group-hover:scale-110",
  };

  const iconColorStyles = {
    default: "text-primary",
    primary: "text-white",
    secondary: "text-white",
    accent: "text-white",
  };

  const glowStyles = {
    default: "",
    primary: "group-hover:animate-glow",
    secondary: "group-hover:shadow-glow-secondary",
    accent: "group-hover:shadow-glow-accent",
  };

  return (
    <Card 
      className={cn(
        "group overflow-hidden transition-all duration-300 hover-lift cursor-pointer",
        "backdrop-blur-sm",
        variantStyles[variant], 
        glowStyles[variant],
        className
      )}
    >
      <CardContent className="p-3 sm:p-5 relative">
        {/* Decorative corner accent */}
        <div className={cn(
          "absolute top-0 right-0 w-20 h-20 opacity-20 rounded-bl-full transition-opacity duration-300 group-hover:opacity-30",
          variant === "primary" && "bg-gradient-primary",
          variant === "secondary" && "bg-gradient-secondary",
          variant === "accent" && "bg-gradient-accent",
          variant === "default" && "bg-primary/20"
        )} />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="text-lg sm:text-3xl font-bold text-foreground truncate animate-fade-in">
              {value}
            </p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] sm:text-xs font-semibold animate-fade-in-up",
                trend.isPositive ? "text-secondary" : "text-destructive"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          
          <div className={cn(
            "w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex-shrink-0 flex items-center justify-center",
            "transition-all duration-300 shadow-md",
            iconBgStyles[variant]
          )}>
            <Icon className={cn(
              "w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:scale-110",
              iconColorStyles[variant]
            )} />
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none transform -skew-x-12 group-hover:translate-x-full" 
          style={{ transition: 'transform 0.8s ease-in-out, opacity 0.3s' }}
        />
      </CardContent>
    </Card>
  );
};

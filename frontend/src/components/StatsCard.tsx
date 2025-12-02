import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
}

export const StatsCard = ({ title, value, icon: Icon, trend, className, variant = "default" }: StatsCardProps) => {
  const variantStyles = {
    default: "border-border bg-card",
    primary: "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10",
    secondary: "border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10",
    accent: "border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10",
  };

  const iconBgStyles = {
    default: "bg-primary/10",
    primary: "bg-primary/20",
    secondary: "bg-secondary/20",
    accent: "bg-accent/20",
  };

  const iconColorStyles = {
    default: "text-primary",
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
  };

  return (
    <Card className={cn("overflow-hidden", variantStyles[variant], className)}>
      <CardContent className="p-2.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-sm sm:text-2xl font-bold text-foreground truncate">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-[10px] sm:text-xs font-medium",
                  trend.isPositive ? "text-secondary" : "text-destructive"
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div className={cn(
            "w-10 h-10 sm:w-14 sm:h-14 rounded-lg flex-shrink-0 flex items-center justify-center",
            iconBgStyles[variant]
          )}>
            <Icon className={cn("w-5 h-5 sm:w-7 sm:h-7", iconColorStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

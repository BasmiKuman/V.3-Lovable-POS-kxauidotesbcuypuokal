import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface NotificationBadgeProps {
  count?: number;
  children: ReactNode;
  showZero?: boolean;
  max?: number;
  variant?: "default" | "primary" | "secondary" | "accent";
  pulse?: boolean;
  className?: string;
}

export const NotificationBadge = ({
  count = 0,
  children,
  showZero = false,
  max = 99,
  variant = "default",
  pulse = false,
  className
}: NotificationBadgeProps) => {
  const shouldShow = count > 0 || showZero;
  const displayCount = count > max ? `${max}+` : count;

  const variantStyles = {
    default: "bg-destructive text-destructive-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      {children}
      {shouldShow && (
        <span className={cn(
          "absolute -top-1 -right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full",
          "text-[10px] font-bold shadow-lg animate-scale-in",
          variantStyles[variant],
          pulse && "animate-pulse"
        )}>
          {displayCount}
          {pulse && (
            <span className={cn(
              "absolute inset-0 rounded-full opacity-75 animate-ping",
              variantStyles[variant]
            )} />
          )}
        </span>
      )}
    </div>
  );
};
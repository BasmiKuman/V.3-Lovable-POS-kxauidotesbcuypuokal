import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EnhancedCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: "primary" | "secondary" | "accent" | "purple";
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  variant?: "default" | "glass" | "gradient";
}

export const EnhancedCard = ({
  title,
  description,
  icon: Icon,
  iconColor = "primary",
  children,
  className,
  headerAction,
  variant = "default"
}: EnhancedCardProps) => {
  const iconColors = {
    primary: "text-primary bg-primary/10",
    secondary: "text-secondary bg-secondary/10",
    accent: "text-accent bg-accent/10",
    purple: "text-[hsl(270,70%,60%)] bg-[hsl(270,70%,60%)]/10",
  };

  const variantStyles = {
    default: "bg-card border-border/50 hover:border-border hover:shadow-md",
    glass: "glass border-border/30 hover:border-primary/30",
    gradient: "bg-gradient-to-br from-card via-primary/5 to-card border-primary/20 hover:border-primary/40 shadow-colored",
  };

  return (
    <Card className={cn(
      "group animate-fade-in-up transition-all duration-300 hover-lift overflow-hidden",
      variantStyles[variant],
      className
    )}>
      <CardHeader className="p-3 sm:p-5 pb-2 sm:pb-3 relative">
        {/* Decorative gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {Icon && (
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                "transition-transform duration-300 group-hover:scale-110 shadow-md",
                iconColors[iconColor]
              )}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold truncate">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-5 pt-2 sm:pt-3">
        {children}
      </CardContent>
    </Card>
  );
};
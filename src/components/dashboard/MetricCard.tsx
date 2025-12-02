import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "accent";
  delay?: number;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  delay = 0,
}: MetricCardProps) {
  const variants = {
    default: "bg-card border-border",
    success: "gradient-success text-primary-foreground border-transparent",
    warning: "gradient-warning text-warning-foreground border-transparent",
    accent: "gradient-accent text-accent-foreground border-transparent",
  };

  const iconVariants = {
    default: "bg-primary/10 text-primary",
    success: "bg-primary-foreground/20 text-primary-foreground",
    warning: "bg-warning-foreground/20 text-warning-foreground",
    accent: "bg-accent-foreground/20 text-accent-foreground",
  };

  const textVariants = {
    default: "text-muted-foreground",
    success: "text-primary-foreground/80",
    warning: "text-warning-foreground/80",
    accent: "text-accent-foreground/80",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:shadow-lg animate-slide-up",
        variants[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn("text-sm font-medium", textVariants[variant])}>
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className={cn("text-sm", textVariants[variant])}>{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span
                className={cn(
                  "font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className={textVariants[variant]}>vs luna trecută</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-3", iconVariants[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-foreground/5" />
    </div>
  );
}

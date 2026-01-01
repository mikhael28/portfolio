import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-offset-2", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary/90 hover:shadow-[var(--shadow-sm)]",
      secondary: "border-border/50 bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:border-border",
      destructive: "border-transparent bg-destructive text-destructive-foreground shadow-[var(--shadow-xs)] hover:bg-destructive/90",
      outline: "text-foreground border-border/60 hover:border-border hover:bg-muted/50",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import * as React from "react";

// Forwards ref + props so it can be used as a Radix `asChild` trigger (e.g. TooltipTrigger).
export const ModeToggle = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, onClick, ...props }, ref) => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      ref={ref}
      variant="ghost"
      type="button"
      size="icon"
      aria-label="Toggle theme"
      className={cn("px-2", className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        setTheme(theme === "dark" ? "light" : "dark");
      }}
    >
      <SunIcon className="h-[1.2rem] w-[1.2rem] text-neutral-800 dark:hidden dark:text-neutral-200" />
      <MoonIcon className="hidden h-[1.2rem] w-[1.2rem] text-neutral-800 dark:block dark:text-neutral-200" />
    </Button>
  );
});
ModeToggle.displayName = "ModeToggle";

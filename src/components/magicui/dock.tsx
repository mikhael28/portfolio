"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, MotionValue, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { PropsWithChildren, useContext, useMemo, useRef } from "react";

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  magnification?: number;
  distance?: number;
  children: React.ReactNode;
}

const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

const dockVariants = cva("mx-auto w-max h-full p-2 flex items-end rounded-full border");

interface DockContextValue {
  mouseX: MotionValue<number>;
  magnification: number;
  distance: number;
}

const DockContext = React.createContext<DockContextValue | null>(null);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ className, children, magnification = DEFAULT_MAGNIFICATION, distance = DEFAULT_DISTANCE, ...props }, ref) => {
    const mouseX = useMotionValue(Infinity);
    const ctx = useMemo<DockContextValue>(
      () => ({ mouseX, magnification, distance }),
      [mouseX, magnification, distance]
    );

    return (
      <DockContext.Provider value={ctx}>
        <motion.div
          ref={ref}
          onMouseMove={(e) => mouseX.set(e.pageX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          {...props}
          className={cn(dockVariants({ className }))}
        >
          {children}
        </motion.div>
      </DockContext.Provider>
    );
  }
);

Dock.displayName = "Dock";

export interface DockIconProps {
  size?: number;
  magnification?: number;
  distance?: number;
  mouseX?: MotionValue<number>;
  className?: string;
  children?: React.ReactNode;
  props?: PropsWithChildren;
}

const DockIcon = ({ size, magnification, distance, mouseX, className, children, ...props }: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const ctx = useContext(DockContext);
  const effectiveMouseX = mouseX ?? ctx?.mouseX;
  const effectiveMagnification = magnification ?? ctx?.magnification ?? DEFAULT_MAGNIFICATION;
  const effectiveDistance = distance ?? ctx?.distance ?? DEFAULT_DISTANCE;

  const fallback = useMotionValue(Infinity);
  const sourceMouseX = effectiveMouseX ?? fallback;

  const distanceCalc = useTransform(sourceMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-effectiveDistance, 0, effectiveDistance],
    [40, effectiveMagnification, 40]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className={cn("flex aspect-square cursor-pointer items-center justify-center rounded-full", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

DockIcon.displayName = "DockIcon";

export { Dock, DockIcon, dockVariants };

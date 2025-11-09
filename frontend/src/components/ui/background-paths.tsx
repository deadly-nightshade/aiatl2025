"use client";

import { motion } from "framer-motion";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

function FloatingPaths({ position = 1 }: { position?: number }) {
  const paths = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    d: `M-${360 - i * 6 * position} -${200 + i * 6}C-${360 - i * 6 * position} -${200 + i * 6} -${300 -
      i * 6 * position} ${160 - i * 5} ${140 - i * 6 * position} ${300 - i * 4}C${640 - i * 6 * position} ${440 -
      i * 3} ${700 - i * 6 * position} ${820 - i * 5} ${700 - i * 6 * position} ${820 - i * 5}`,
    stroke: `hsl(${222 + i}, 90%, ${80 - i}%)`,
    opacity: 0.08 + i * 0.02,
    width: 0.4 + i * 0.02,
  }));

  return (
    <svg className="h-full w-full" viewBox="0 0 696 316" fill="none" aria-hidden>
      {paths.map((path) => (
        <motion.path
          key={`path-${position}-${path.id}`}
          d={path.d}
          stroke="currentColor"
          strokeOpacity={path.opacity}
          strokeWidth={path.width}
          initial={{ pathLength: 0.2, opacity: 0.4 }}
          animate={{ pathLength: 1, pathOffset: [0, 1, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 24 + Math.random() * 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      ))}
    </svg>
  );
}

interface BackgroundPathsProps extends HTMLAttributes<HTMLDivElement> {
  hideContent?: boolean;
}

export function BackgroundPaths({ hideContent = false, className, children, ...props }: BackgroundPathsProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background", 
        hideContent && "pointer-events-none",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 text-primary/40 dark:text-primary/30">
        <FloatingPaths position={1} />
      </div>
      <div className="absolute inset-0 text-accent/30 dark:text-accent/20">
        <FloatingPaths position={-1} />
      </div>
      {!hideContent && <div className="relative z-10 w-full">{children}</div>}
    </div>
  );
}

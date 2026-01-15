import * as React from "react";
import { cn } from "@/lib/utils";

export interface ReaderSurfaceProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "japanese" | "english";
}

const ReaderSurface = React.forwardRef<HTMLDivElement, ReaderSurfaceProps>(
  ({ className, variant = "japanese", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md transition-colors duration-200",
          variant === "japanese" &&
            "reading-surface p-8 max-w-prose",
          variant === "english" &&
            "bg-muted/50 border border-border-subtle p-6 text-muted-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
ReaderSurface.displayName = "ReaderSurface";

export { ReaderSurface };

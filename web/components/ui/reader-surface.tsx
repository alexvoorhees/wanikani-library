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
          "p-6 rounded-lg shadow-inner",
          variant === "japanese" && "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-primary/20",
          variant === "english" && "bg-gray-50 border border-gray-200",
          className
        )}
        {...props}
      />
    );
  }
);
ReaderSurface.displayName = "ReaderSurface";

export { ReaderSurface };

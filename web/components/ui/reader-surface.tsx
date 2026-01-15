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
          "p-6 rounded-lg",
          variant === "japanese" && "bg-blue-50/50 border border-blue-200/50",
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

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex items-center w-full rounded-md border border-border bg-background px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground transition-all duration-200",
          type === "file"
            ? "h-11 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            : "h-10 py-2",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

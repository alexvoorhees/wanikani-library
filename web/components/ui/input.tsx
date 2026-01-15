import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex items-center w-full rounded-lg border-2 border-gray-300 bg-white px-4 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-gray-900 transition-colors",
          type === "file" ? "h-12 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer text-gray-600" : "h-11 py-3",
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

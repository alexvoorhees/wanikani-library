import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeMap = {
      sm: { container: "h-6 w-6", viewBox: "0 0 60 60", strokeWidth: 4 },
      md: { container: "h-8 w-8", viewBox: "0 0 80 80", strokeWidth: 5 },
      lg: { container: "h-16 w-16", viewBox: "0 0 120 120", strokeWidth: 6 },
    };

    const { container, viewBox, strokeWidth } = sizeMap[size];

    return (
      <div
        ref={ref}
        className={cn(container, "relative", className)}
        {...props}
      >
        <svg
          className="w-full h-full"
          viewBox={viewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>
            {`
              @keyframes brushStroke1 {
                0%, 100% { stroke-dashoffset: 300; opacity: 0.3; }
                25% { stroke-dashoffset: 0; opacity: 1; }
                50% { stroke-dashoffset: -300; opacity: 0.3; }
              }
              @keyframes brushStroke2 {
                0%, 100% { stroke-dashoffset: 300; opacity: 0.3; }
                50% { stroke-dashoffset: 0; opacity: 1; }
                75% { stroke-dashoffset: -300; opacity: 0.3; }
              }
              @keyframes brushStroke3 {
                0%, 100% { stroke-dashoffset: 0; opacity: 1; }
                25% { stroke-dashoffset: -300; opacity: 0.3; }
                75% { stroke-dashoffset: 300; opacity: 0.3; }
              }
              .brush-stroke-1 {
                stroke-dasharray: 150;
                animation: brushStroke1 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              }
              .brush-stroke-2 {
                stroke-dasharray: 150;
                animation: brushStroke2 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              }
              .brush-stroke-3 {
                stroke-dasharray: 150;
                animation: brushStroke3 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              }
            `}
          </style>

          {/* Three brush stroke arcs forming a circular pattern */}
          <path
            className="brush-stroke-1"
            d="M 60 10 A 50 50 0 0 1 95 80"
            stroke="hsl(225 35% 35%)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <path
            className="brush-stroke-2"
            d="M 95 80 A 50 50 0 0 1 25 80"
            stroke="hsl(225 35% 35%)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <path
            className="brush-stroke-3"
            d="M 25 80 A 50 50 0 0 1 60 10"
            stroke="hsl(225 35% 35%)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }
);
Spinner.displayName = "Spinner";

export { Spinner };

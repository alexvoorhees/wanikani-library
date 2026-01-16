import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeMap = {
      sm: { container: "h-6 w-6", viewBox: "0 0 100 100" },
      md: { container: "h-8 w-8", viewBox: "0 0 100 100" },
      lg: { container: "h-16 w-16", viewBox: "0 0 100 100" },
    };

    const { container, viewBox } = sizeMap[size];

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
          <defs>
            {/* Filter to give organic ink-like texture */}
            <filter id="brush-texture">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="3"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="1.5"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>

          <style>
            {`
              @keyframes drawBrushStroke {
                0% {
                  stroke-dashoffset: 314;
                  opacity: 0.7;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  stroke-dashoffset: 0;
                  opacity: 0.7;
                }
              }
              .brush-circle {
                stroke-dasharray: 314;
                animation: drawBrushStroke 2s ease-in-out infinite;
                filter: url(#brush-texture);
              }
            `}
          </style>

          {/* Circular brush stroke with organic variation */}
          <path
            className="brush-circle"
            d="M 50,15
               C 70,15 85,30 85,50
               C 85,70 70,85 50,85
               C 30,85 15,70 15,50
               C 15,30 30,15 50,15"
            stroke="hsl(225 35% 35%)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />
        </svg>
      </div>
    );
  }
);
Spinner.displayName = "Spinner";

export { Spinner };

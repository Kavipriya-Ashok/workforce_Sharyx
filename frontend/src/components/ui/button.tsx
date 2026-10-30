import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "emerald" | "blue";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/25 font-semibold",
      blue: "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/25 font-semibold",
      emerald: "bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 shadow-md shadow-emerald-500/20",
      secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60",
      outline: "border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white",
      ghost: "text-slate-400 hover:text-white hover:bg-slate-800/40",
      destructive: "bg-rose-600 text-white hover:bg-rose-500 shadow-sm",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-6 text-base",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

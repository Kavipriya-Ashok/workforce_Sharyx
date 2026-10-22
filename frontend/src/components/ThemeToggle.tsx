import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-700/50 bg-slate-800/60 dark:bg-slate-900/80 text-slate-300 hover:text-white hover:border-violet-500/50 shadow-sm backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer ${className}`}
    >
      <Sun
        className={`h-4 w-4 transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0 absolute"
            : "rotate-0 scale-100 opacity-100 text-amber-500"
        }`}
      />
      <Moon
        className={`h-4 w-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100 text-violet-400"
            : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative group overflow-hidden hover:border-primary/50 transition-all duration-300 hover-lift"
    >
      {/* Background glow effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        theme === "dark" ? "bg-gradient-to-br from-yellow-400/20 to-orange-400/20" : "bg-gradient-to-br from-blue-400/20 to-purple-400/20"
      }`} />
      
      {/* Icons with smooth transition */}
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all duration-500 ${
        theme === "dark" 
          ? "rotate-90 scale-0 opacity-0" 
          : "rotate-0 scale-100 opacity-100"
      } text-yellow-500`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-500 ${
        theme === "dark" 
          ? "rotate-0 scale-100 opacity-100" 
          : "-rotate-90 scale-0 opacity-0"
      } text-blue-500`} />
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

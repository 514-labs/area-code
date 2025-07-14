import { Moon, Sun } from "lucide-react";
import { useTheme } from "@workspace/ui/components/theme-provider";
import { SidebarMenuButton } from "@workspace/ui/components/sidebar";

export function SidebarThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <SidebarMenuButton onClick={toggleTheme} className="cursor-pointer">
      <ThemeIcon />
      <span>{`Theme: ${theme === "dark" ? "Dark" : "Light"}`}</span>
    </SidebarMenuButton>
  );
}

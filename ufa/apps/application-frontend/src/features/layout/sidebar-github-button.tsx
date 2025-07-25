import { Github } from "lucide-react";
import { SidebarMenuButton } from "@workspace/ui/components/sidebar";

export function SidebarGithubButton() {
  return (
    <SidebarMenuButton asChild className="cursor-pointer">
      <a
        href="https://github.com/514-labs/area-code"
        rel="noopener noreferrer"
        target="_blank"
        className="dark:text-foreground"
      >
        <Github />
        <span>GitHub</span>
      </a>
    </SidebarMenuButton>
  );
}

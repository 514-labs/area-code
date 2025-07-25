import { Database, DatabaseBackup } from "lucide-react";
import { SidebarMenuButton } from "@workspace/ui/components/sidebar";
import { useFrontendCaching } from "./cache-context";

export function SidebarFrontendCacheToggle() {
  const { cacheEnabled, toggleCache } = useFrontendCaching();

  const CacheIcon = cacheEnabled ? Database : DatabaseBackup;

  return (
    <SidebarMenuButton onClick={toggleCache} className="cursor-pointer">
      <CacheIcon />
      <span>{`Frontend Cache: ${cacheEnabled ? "Enabled" : "Disabled"}`}</span>
    </SidebarMenuButton>
  );
}

import { Database, DatabaseBackup } from "lucide-react";
import { SidebarMenuButton } from "@workspace/ui/components/sidebar";
import { useCache } from "../contexts/cache-context";

export function SidebarCacheToggle() {
  const { cacheEnabled, toggleCache } = useCache();

  const CacheIcon = cacheEnabled ? Database : DatabaseBackup;

  return (
    <SidebarMenuButton onClick={toggleCache} className="cursor-pointer">
      <CacheIcon />
      <span>{`Frontend Cache: ${cacheEnabled ? "Enabled" : "Disabled"}`}</span>
    </SidebarMenuButton>
  );
}

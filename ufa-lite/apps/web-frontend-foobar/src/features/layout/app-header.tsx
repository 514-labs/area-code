import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { RetrievalHighlightWrapper } from "@/features/origin-highlights/origin-highlights-wrappers";
import { Button } from "@workspace/ui";

export function AppHeader() {

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium"></h1>

        {/* Search removed in ufa-lite */}

        <div className="ml-auto" />
      </div>
    </header>
  );
}

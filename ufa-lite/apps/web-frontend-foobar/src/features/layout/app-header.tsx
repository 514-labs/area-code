import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
// Retrieval highlight wrapper is not used when search is omitted
import { useChatLayout } from "./resizable-chat-layout";
import { Button } from "@workspace/ui";

export function AppHeader() {
  const { isChatOpen, toggleChat } = useChatLayout();

  // Search is omitted in ufa-lite

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium"></h1>

        {/* Search omitted in ufa-lite */}

        <Button size="sm" onClick={toggleChat} className="ml-auto">
          {isChatOpen ? "Close Chat" : "Open Chat"}
          <span className="sr-only">Toggle Chat</span>
        </Button>
      </div>
    </header>
  );
}

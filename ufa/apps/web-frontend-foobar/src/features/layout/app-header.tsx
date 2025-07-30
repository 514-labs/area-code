import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { SearchCommand } from "@/features/search/components/search-command";
import type { SearchResult } from "@/features/search/types/search";
import { RetrievalHighlightWrapper } from "@/features/origin-highlights/origin-highlights-wrappers";
import { useChatLayout } from "./resizable-chat-layout";
import { Button } from "@workspace/ui";

export function AppHeader() {
  const { isChatOpen, toggleChat } = useChatLayout();

  const handleSearchSelect = (result: SearchResult) => {
    // Handle navigation based on search result
    console.log("Navigate to:", result);

    // Example navigation logic - customize based on your routing needs
    if (result.type === "foo") {
      // Navigate to foo detail page
      // In a real app, you'd use your router here (e.g., Next.js router, React Router, etc.)
      console.log(`Navigate to /foo/${result.id}`);
    } else if (result.type === "bar") {
      // Navigate to bar detail page
      console.log(`Navigate to /bar/${result.id}`);
    }
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium"></h1>

        <RetrievalHighlightWrapper className="flex-1 flex justify-center mx-4 rounded-md">
          <SearchCommand
            className="w-full "
            onSelect={handleSearchSelect}
            placeholder="Search documents..."
          />
        </RetrievalHighlightWrapper>

        <Button size="sm" onClick={toggleChat} className="ml-auto">
          {isChatOpen ? "Close Chat" : "Open Chat"}
          <span className="sr-only">Toggle Chat</span>
        </Button>
      </div>
    </header>
  );
}

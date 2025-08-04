import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Layout } from "@/features/layout/layout";
import { FrontendCachingContextProvider } from "@/features/frontend-caching/cache-context";
import { OriginHighlightsContextProvider } from "@/features/origin-highlights/origin-highlights-context";

export const Route = createRootRoute({
  component: () => (
    <>
      <OriginHighlightsContextProvider>
        <FrontendCachingContextProvider>
          <Layout>
            <Outlet />
          </Layout>
        </FrontendCachingContextProvider>
      </OriginHighlightsContextProvider>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  ),
});

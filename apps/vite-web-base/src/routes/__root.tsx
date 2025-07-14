import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Layout } from "../components/layout";
import { CacheContextProvider } from "../contexts/cache-context";
import { ServiceHighlightContextProvider } from "../contexts/service-highlight-context";

export const Route = createRootRoute({
  component: () => (
    <>
      <ServiceHighlightContextProvider>
        <CacheContextProvider>
          <Layout>
            <Outlet />
          </Layout>
        </CacheContextProvider>
      </ServiceHighlightContextProvider>
      <TanStackRouterDevtools />
    </>
  ),
});

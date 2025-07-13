import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Layout } from "../components/layout";
import { CacheContextProvider } from "../contexts/cache-context";

export const Route = createRootRoute({
  component: () => (
    <>
      <CacheContextProvider>
        <Layout>
          <Outlet />
        </Layout>
      </CacheContextProvider>
      <TanStackRouterDevtools />
    </>
  ),
});

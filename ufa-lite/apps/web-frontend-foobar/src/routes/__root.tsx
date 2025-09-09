import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Layout } from "@/features/layout/layout";
import { FrontendCachingContextProvider } from "@/features/frontend-caching/cache-context";
import { OriginHighlightsContextProvider } from "@/features/origin-highlights/origin-highlights-context";
import { AuthProvider } from "@/auth/auth-context";

const ROUTES_WITHOUT_LAYOUT = ["/signin", "/signup"];

function RootComponent() {
  const location = useLocation();
  const isRouteWithoutLayout = ROUTES_WITHOUT_LAYOUT.includes(
    location.pathname
  );

  if (isRouteWithoutLayout) {
    return (
      <AuthProvider>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <OriginHighlightsContextProvider>
        <FrontendCachingContextProvider>
          <Layout>
            <Outlet />
          </Layout>
        </FrontendCachingContextProvider>
      </OriginHighlightsContextProvider>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

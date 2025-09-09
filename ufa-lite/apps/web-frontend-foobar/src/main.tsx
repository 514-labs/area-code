import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@workspace/ui/components/theme-provider";
import { supabase } from "./auth/supabase";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./index.css";

// Create a new router instance
const router = createRouter({ routeTree });

// Override fetch globally to include auth headers
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    ...init.headers,
  };

  if (session?.access_token) {
    (headers as Record<string, string>)["Authorization"] =
      `Bearer ${session.access_token}`;
  }

  return originalFetch(input, {
    ...init,
    headers,
  });
};

// Create a client
const queryClient = new QueryClient();

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);

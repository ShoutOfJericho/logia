import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetLexicon, getGetLexiconQueryKey } from "@workspace/api-client-react";
import { initLexicon, isLexiconReady } from "@/lib/bibleLexicon";
import { AppLayout } from "@/components/AppLayout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import NewSession from "@/pages/NewSession";
import LiveSession from "@/pages/LiveSession";
import SessionReview from "@/pages/SessionReview";
import SessionsLibrary from "@/pages/SessionsLibrary";
import Insights from "@/pages/Insights";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function LexiconLoader() {
  const { data } = useGetLexicon({
    query: { queryKey: getGetLexiconQueryKey(), staleTime: Infinity },
  });
  useEffect(() => {
    if (data && !isLexiconReady()) {
      initLexicon(data.names, data.ahaPatterns);
    }
  }, [data]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/session/new" component={NewSession} />
      <Route path="/session/:id/live" component={LiveSession} />
      <Route path="/session/:id" component={SessionReview} />
      <Route path="/sessions" component={SessionsLibrary} />
      <Route path="/insights" component={Insights} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <LexiconLoader />
          <AppLayout>
            <Router />
          </AppLayout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

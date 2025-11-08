import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AIResponseInput } from "@/components/AIResponseInput";
import { ComplianceReport } from "@/components/ComplianceReport";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBotFeed } from "@/hooks/use-bot-feed";
import { toast } from "@/hooks/use-toast";

export default function Index() {
  const { responses, reports, isPolling, error, refresh } = useBotFeed();
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  useEffect(() => {
    if (responses.length === 0) {
      return;
    }
    // Auto-select the latest response when none is chosen.
    if (!selectedResponseId) {
      setSelectedResponseId(responses[responses.length - 1].id);
    }
  }, [responses, selectedResponseId]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Bot feed error",
        description: error,
      });
    }
  }, [error]);

  const activeReport = useMemo(
    () => (selectedResponseId ? reports[selectedResponseId] ?? null : null),
    [reports, selectedResponseId],
  );

  const selectedResponse = useMemo(
    () => responses.find((response) => response.id === selectedResponseId) ?? null,
    [responses, selectedResponseId],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-info/10 transition-colors">
      <div className="absolute inset-x-0 top-[-10%] mx-auto h-64 w-3/4 rounded-full bg-gradient-to-br from-primary/10 via-info/10 to-transparent blur-3xl" />
      <div className="container relative mx-auto px-4 py-10">
        <header className="mb-10 flex flex-col gap-6 rounded-3xl border border-border/60 bg-card/60 p-8 shadow-lg backdrop-blur-xl transition-colors lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo.svg"
              alt="HealthGuard AI logo"
              className="h-16 w-16 rounded-2xl shadow-glow ring-1 ring-primary/20"
            />
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Bot Middleware Monitor
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
                Compliance Stream for GPT-5
              </h1>
              <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
                Observe automated outputs, track verification status, and review compliance findings in real time. No
                input required—just monitor the flow.
              </p>
            </div>
          </div>

  audience: mention autop reload? Add refresh button area with theme toggle:

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-border/60 bg-background/80 px-5 py-4 text-sm shadow-sm backdrop-blur">
              <p className="font-medium text-foreground">Status</p>
              <p className="text-xs text-muted-foreground">
                {isPolling ? "Polling bot feed for updates" : "Idle"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={refresh} disabled={isPolling} className="rounded-full px-4">
                Refresh now
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <AIResponseInput
              responses={responses}
              selectedId={selectedResponseId}
              onSelect={setSelectedResponseId}
              isPolling={isPolling}
              error={error}
            />
          </div>

  maybe add history log detail? The left column will just have AIResponseInput; fine.

          <div className="lg:sticky lg:top-8 lg:h-fit">
            <ComplianceReport report={activeReport} isLoading={selectedResponse?.status === "verifying"} />
          </div>
        </div>
      </div>
    </div>
  );
}

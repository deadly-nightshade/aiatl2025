import { AlertCircle, CheckCircle2, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIResponse } from "@/types/ai";
import { formatESTTime } from "@/lib/time";

interface AIResponseInputProps {
  responses: AIResponse[];
  selectedId?: string | null;
  onSelect?: (responseId: string) => void;
  isPolling?: boolean;
  error?: string | null;
}

export function AIResponseInput({
  responses,
  selectedId = null,
  onSelect,
  isPolling = false,
  error = null,
}: AIResponseInputProps) {
  const getStatusIcon = (status: AIResponse["status"]) => {
    switch (status) {
      case "verifying":
        return <Loader2 className="h-4 w-4 animate-spin text-info" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "failed":
        return <TriangleAlert className="h-4 w-4 text-destructive" />;
      case "verified":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Sparkles className="h-4 w-4 text-info" />;
    }
  };

  const getStatusColor = (status: AIResponse["status"]) => {
    switch (status) {
      case "verified":
        return "border-success/20 bg-success/5";
      case "warning":
        return "border-warning/20 bg-warning/5";
      case "verifying":
        return "border-info/20 bg-info/5";
      case "failed":
        return "border-destructive/30 bg-destructive/10";
      default:
        return "border-border/60 bg-card";
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return formatESTTime(iso);
    } catch {
      return "—";
    }
  };

  const statusLabel = (response: AIResponse) => {
    switch (response.status) {
      case "pending":
        return "Pending verification";
      case "verifying":
        return "Running compliance checks";
      case "verified":
        return "Verified";
      case "warning":
        return "Verified with warnings";
      case "failed":
        return "Verification failed";
      default:
        return response.status;
    }
  };

  if (responses.length === 0) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-info flex items-center justify-center shadow-glow">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No AI Responses Yet</h3>
          <p className="text-sm text-muted-foreground">
            AI-generated responses will appear here for fact-checking and verification
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-info/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-info flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>AI Response Verification</CardTitle>
            <CardDescription>
              Review and fact-check AI-generated responses
            </CardDescription>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="capitalize">
            {responses.length} response{responses.length === 1 ? "" : "s"}
          </Badge>
          {isPolling && (
            <span className="inline-flex items-center gap-2 text-info">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              polling bot feed
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-3.5 w-3.5" />
              {error}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {responses.map((response, index) => (
            <div
              key={response.id}
              className={cn(
                "group relative rounded-2xl border-2 p-4 transition-all duration-300",
                getStatusColor(response.status),
                selectedId === response.id ? "ring-2 ring-primary shadow-lg scale-[1.01]" : "hover:shadow-md",
                "animate-slide-up cursor-pointer"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => onSelect?.(response.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(response.status)}
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatTimestamp(response.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {typeof response.confidence === "number" && (
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "font-semibold",
                        response.confidence > 90 && "bg-success/10 text-success border-success/20",
                        response.confidence > 70 && response.confidence <= 90 && "bg-info/10 text-info border-info/20",
                        response.confidence <= 70 && "bg-warning/10 text-warning border-warning/20"
                      )}
                    >
                      {response.confidence}% confidence
                    </Badge>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {statusLabel(response)}
                  </Badge>
                </div>
              </div>

              <div className="relative">
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {response.content}
                </p>

                {response.content.length > 300 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                )}
              </div>

              {response.status === "failed" && response.metadata?.verificationError && (
                <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <div className="flex items-center gap-2 font-medium">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    Verification error
                  </div>
                  <p className="mt-1 text-destructive/90">{String(response.metadata.verificationError)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

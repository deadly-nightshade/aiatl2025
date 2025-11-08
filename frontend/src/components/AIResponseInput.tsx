import { useState } from "react";
import { RefreshCw, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AIResponse {
  id: string;
  content: string;
  timestamp: Date;
  status: "pending" | "verified" | "warning";
  confidence?: number;
}

interface AIResponseInputProps {
  responses?: AIResponse[];
  onRecheck?: (responseId: string) => void;
  recheckingId?: string | null;
}

export function AIResponseInput({
  responses = [],
  onRecheck,
  recheckingId = null,
}: AIResponseInputProps) {
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  const getStatusIcon = (status: AIResponse["status"]) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      default:
        return <Sparkles className="w-5 h-5 text-info" />;
    }
  };

  const getStatusColor = (status: AIResponse["status"]) => {
    switch (status) {
      case "verified":
        return "border-success/30 bg-success/5";
      case "warning":
        return "border-warning/30 bg-warning/5";
      default:
        return "border-info/30 bg-info/5";
    }
  };

  if (responses.length === 0) {
    return (
      <Card className="glass-effect shadow-lg">
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
    <Card className="glass-effect shadow-xl animate-in">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-info/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-info flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>AI Response Verification</CardTitle>
            <CardDescription>
              Review and fact-check AI-generated responses
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {responses.map((response, index) => (
            <div
              key={response.id}
              className={cn(
                "group relative rounded-xl border-2 p-5 transition-all duration-300",
                getStatusColor(response.status),
                selectedResponse === response.id 
                  ? "ring-2 ring-primary shadow-xl scale-[1.02]" 
                  : "hover:shadow-lg hover:scale-[1.01]",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setSelectedResponse(response.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(response.status)}
                  <span className="text-xs font-medium text-muted-foreground">
                    {response.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {response.confidence && (
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
                    {response.status}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="relative">
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {response.content}
                  </p>
                </div>
                
                {/* Gradient overlay for long content */}
                {response.content.length > 300 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecheck?.(response.id);
                  }}
                  disabled={recheckingId === response.id}
                  className="w-full transition-all hover:bg-primary/10 hover:border-primary"
                >
                  <RefreshCw className={cn(
                    "w-4 h-4 mr-2",
                    recheckingId === response.id && "animate-spin"
                  )} />
                  {recheckingId === response.id ? "Rechecking..." : "Recheck Response"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

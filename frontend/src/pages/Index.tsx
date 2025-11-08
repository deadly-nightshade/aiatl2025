import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ChatInput } from "@/components/ChatInput";
import { ComplianceReport } from "@/components/ComplianceReport";
import { AIResponseInput } from "@/components/AIResponseInput";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Index() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    verified: any[];
    warnings: any[];
    citations: any[];
  }>({
    verified: [],
    warnings: [],
    citations: [],
  });
  const [aiResponses, setAiResponses] = useState<any[]>([
    {
      id: "1",
      content: "Based on the HIPAA Security Rule, healthcare providers must implement physical, administrative, and technical safeguards to protect electronic protected health information (ePHI). This includes access controls, encryption, and audit logs.",
      timestamp: new Date(),
      status: "pending",
      confidence: 85,
    },
    {
      id: "2",
      content: "The 21st Century Cures Act requires healthcare organizations to implement measures that prevent information blocking and ensure patients have access to their electronic health information without delay.",
      timestamp: new Date(),
      status: "verified",
      confidence: 92,
    },
  ]);

  const handleFilesUploaded = async (files: File[]) => {
    // TODO: Integrate with your backend API
    toast({
      title: "Files uploaded",
      description: `${files.length} file(s) uploaded successfully`,
    });
    console.log("Files to upload:", files);
  };

  const handleRecheckResponse = async (responseId: string) => {
    setRecheckingId(responseId);
    
    // TODO: Integrate with your backend API
    console.log("Rechecking response:", responseId);

    setTimeout(() => {
      setAiResponses((prev) =>
        prev.map((response) =>
          response.id === responseId
            ? { ...response, status: "verified", confidence: 95 }
            : response
        )
      );
      
      toast({
        title: "Response rechecked",
        description: "AI response has been verified successfully",
      });
      
      setRecheckingId(null);
    }, 1500);
  };

  const handleSendMessage = async (message: string) => {
    setIsProcessing(true);
    
    // TODO: Integrate with your backend API
    console.log("Query message:", message);

    // Simulate API call with mock data
    setTimeout(() => {
      setReportData({
        verified: [
          {
            id: "1",
            text: "HIPAA privacy rule compliance verified for patient data handling procedures.",
            confidence: 95,
            source: "Section 2.3.1",
          },
          {
            id: "2",
            text: "Electronic health record retention policies meet federal requirements.",
            confidence: 92,
            source: "Section 4.1",
          },
        ],
        warnings: [
          {
            id: "3",
            text: "Incomplete documentation for breach notification procedures. Review recommended.",
            source: "Section 5.2.4",
          },
        ],
        citations: [
          {
            id: "4",
            text: "45 CFR § 164.308 - Administrative safeguards",
            source: "https://www.hhs.gov/hipaa",
          },
          {
            id: "5",
            text: "21 CFR Part 11 - Electronic records; electronic signatures",
            source: "https://www.fda.gov/regulatory-information",
          },
        ],
      });
      
      toast({
        title: "Analysis complete",
        description: "Compliance report generated successfully",
      });
      
      setIsProcessing(false);
    }, 2000);
  };

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
                Powered by AI
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
                Healthcare Compliance Copilot
              </h1>
              <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
                Upload evidence, interrogate responses, and track regulatory coverage with a single streamlined assistant.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-border/60 bg-background/80 px-5 py-4 text-sm shadow-sm backdrop-blur">
              <p className="font-medium text-foreground">Realtime Compliance Pulse</p>
              <p className="text-xs text-muted-foreground">
                Stay aligned with HIPAA, 21st Century Cures Act, and beyond
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <FileUpload onFilesUploaded={handleFilesUploaded} />
            <ChatInput onSend={handleSendMessage} isLoading={isProcessing} />
            <AIResponseInput
              responses={aiResponses}
              onRecheck={handleRecheckResponse}
              recheckingId={recheckingId}
            />
          </div>

          {/* Right Column */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <ComplianceReport
              verified={reportData.verified}
              warnings={reportData.warnings}
              citations={reportData.citations}
              isLoading={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

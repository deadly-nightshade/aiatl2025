import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ChatInput } from "@/components/ChatInput";
import { ComplianceReport } from "@/components/ComplianceReport";
import { AIResponseInput } from "@/components/AIResponseInput";
import { toast } from "@/hooks/use-toast";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/10 to-info/15">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/logo.svg"
              alt="HealthGuard AI logo"
              className="h-20 w-20 rounded-3xl shadow-glow"
            />
          </div>
          <div className="inline-block mb-4 px-6 py-2 rounded-full bg-gradient-primary text-white font-semibold shadow-glow animate-in">
            Powered by AI
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent animate-in drop-shadow-sm">
            Healthcare AI Compliance Assistant
          </h1>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Upload compliance documents, verify AI responses, and ensure regulatory adherence with confidence
          </p>
        </header>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
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

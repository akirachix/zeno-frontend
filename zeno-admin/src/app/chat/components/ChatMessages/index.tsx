"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import UserMessage from "./components/UserMessageCard";
import AgentMessage from "./components/AgentMessageCard"; // ← Now uses _thinkingContent etc.
import FeedbackButtons from "../FeedbackButtons";
import ChatArtifactRenderer from "./components/ArtifactRender";
import type { ChatMessagesProps, RunLike, RunFile } from "../../../utils/types/chat";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Image from "next/image";

export default function ChatMessages({
  runs: runsProp,
  onRetry,
  userId,
  runLimitError
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const singlePrintRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [runToDownload, setRunToDownload] = useState<RunLike | null>(null);

  const runs = useMemo(() => Array.isArray(runsProp) ? runsProp : [], [runsProp]);

  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && isNearBottom()) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isNearBottom]);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [runs, scrollToBottom]);

  const generatePDF = async (run: RunLike) => {
    setRunToDownload(run);
    setIsGenerating(true);
  };

  useEffect(() => {
    if (isGenerating && runToDownload && singlePrintRef.current) {
      const capture = async () => {
        try {
          const canvas = await html2canvas(singlePrintRef.current!, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#0B182F",
            logging: false,
          });

          if (canvas.width <= 0 || canvas.height <= 0) return;

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (isNaN(imgHeight) || imgHeight <= 0) return;

          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
          pdf.save(`zeno-message-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
          console.error("PDF generation failed:", error);
        } finally {
          setIsGenerating(false);
          setRunToDownload(null);
        }
      };

      capture();
    }
  }, [isGenerating, runToDownload]);

  return (
    <>
      {/* PDF Print Shadow DOM (unchanged) */}
      {runToDownload && (
        <div ref={singlePrintRef} style={{ /* ... */ }}>
          {/* ... */}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 w-full xl:max-w-5xl lg:max-w-2xl md:max-w-xl mx-auto scrollbar-hide"
      >
        {runs.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No messages yet.</div>
        ) : (
          runs.map((run: RunLike) => (
            <div key={run.id}>
              <UserMessage
                text={run.user_input}
                files={
                  run.files
                    ? run.files.map((file) =>
                        typeof file === "object" && "file" in file && "previewUrl" in file
                          ? (file as RunFile)
                          : { file, previewUrl: "" }
                      )
                    : undefined
                }
              />

              {/* ✅ FIXED: Use run directly — AgentMessage reads _thinkingContent/_progressMessages */}
              {(run.status === "pending" || run.status === "running") && (
                <AgentMessage run={run} loading={true} />
              )}

              {/* ✅ FIXED: Also pass `run` for completed runs (for artifact consistency) */}
              {run.status === "completed" && (
                <>
                  {/* Final output or fallback to thinking if no final (edge case) */}
                  <AgentMessage 
                    run={run} 
                    text={run.final_output ?? (run._thinkingContent || "No response generated.")} 
                  />

                  {/* Render non-progress/thinking artifacts */}
                  {Array.isArray(run.output_artifacts) &&
                    run.output_artifacts
                      .filter(a => !['progress', 'thinking'].includes(a.artifact_type))
                      .map((artifact, idx) => (
                        <ChatArtifactRenderer
                          key={artifact.id ?? `art-${idx}`}
                          artifactType={artifact.artifact_type as any}
                          artifactData={artifact.data}
                          text={artifact.title}
                        />
                      ))}

                  <div className="flex mt-3">
                    <FeedbackButtons
                      userId={userId ?? 0}
                      textToCopy={run.final_output || ""}
                      onDownloadReport={generatePDF}
                      runData={run}
                    />
                  </div>
                </>
              )}

              {run.status === "failed" && (
                <div className="flex items-center gap-2 ml-10">
                  <span className="text-red-500">Failed to send</span>
                  {!runLimitError && onRetry && (
                    <button
                      onClick={() => onRetry(run)}
                      className="text-blue-400 underline"
                    >
                      Retry
                    </button>
                  )}
                  {runLimitError && (
                    <span className="text-white ml-2">
                      Run limit reached. Retry unavailable.
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-lg">Generating PDF...</div>
        </div>
      )}
    </>
  );
}
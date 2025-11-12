import React, { useMemo } from "react";
import Image from "next/image";
import { RunLike } from "../../../../../utils/types/chat";

interface AgentMessageProps {
  run?: RunLike;
  text?: string | null;
  loading?: boolean;
}

export default function AgentMessage({ run, text, loading }: AgentMessageProps) {
  const { thinking: rawThinking, progress: progressMessages } = useMemo(() => {
    if (!run?.output_artifacts) return { thinking: "", progress: [] as string[] };

    let thinking = "";
    const progress: string[] = [];

    run.output_artifacts.forEach((artifact) => {
      if (artifact.artifact_type === "thinking") {
        if (typeof artifact.data === "string") {
          thinking += artifact.data;
        } else if (artifact.data && typeof artifact.data === "object") {
          const content = (artifact.data as { content?: string }).content;
          if (content) thinking += content;
        }
      } else if (artifact.artifact_type === "progress") {
        if (typeof artifact.data === "string") {
          progress.push(artifact.data);
        } else if (artifact.data && typeof artifact.data === "object") {
          const message = (artifact.data as { message?: string }).message;
          if (message) progress.push(message);
        }
      }
    });

    return { thinking, progress };
  }, [run?.output_artifacts]);

  const finalOutput = text ?? run?.final_output ?? null;

  const isActivelyStreaming = useMemo(() => {
    if (loading) return true;
    if (run?.status === 'pending' || run?.status === 'running') return true;
    if (progressMessages.length > 0 && !finalOutput) return true;
    return false;
  }, [loading, run?.status, progressMessages, finalOutput]);

  if (isActivelyStreaming) {
    return (
      <div className="flex flex-col items-start mb-5">
        <div className="mb-2 flex items-center gap-2">
          <Image
            src="/images/zeno-logo-icon.png"
            alt="Zeno AI Logo"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="text-sm font-medium text-cyan-400 md:text-base">Zeno AI • Thinking</span>
        </div>

        <div className="bg-[#131F36] text-white p-4 md:p-5 rounded-2xl rounded-bl-none max-w-[85%] shadow-lg relative">
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>

          {progressMessages.length > 0 ? (
            <div>
              <div className="text-sm font-medium text-gray-300 md:text-base mb-2">Analysis in progress:</div>
              <div className="space-y-2">
                {progressMessages.map((msg, index) => (
                  <div key={index} className="flex items-start gap-2.5">
                    <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0"></div>
                    <span className="text-base leading-relaxed text-gray-100 
                      md:text-lg md:leading-normal 
                      xl:text-xl xl:leading-relaxed">
                      {msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-base md:text-lg xl:text-xl">Initializing analysis…</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!finalOutput) return null;

  return (
    <div className="flex flex-col items-start mb-5">
      <div className="mb-2 flex items-center gap-2">
        <Image
          src="/images/zeno-logo-icon.png"
          alt="Zeno AI Logo"
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="text-sm font-medium text-cyan-400 md:text-base">Zeno AI</span>
      </div>
      
      <div className="bg-[#131F36] text-white p-4 md:p-5 rounded-2xl rounded-bl-none max-w-[85%] shadow-lg">
        {progressMessages.length > 0 && (
          <details className="group mb-4 pb-3 border-b border-gray-700">
            <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-medium text-gray-400 
              md:text-base hover:text-cyan-300 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 md:h-5 md:w-5 group-open:rotate-180 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              <span>View Thought Process</span>
              <span className="text-gray-500 ml-1">({progressMessages.length} steps)</span>
            </summary>
            <div className="mt-3 space-y-2">
              {progressMessages.map((msg, index) => (
                <div key={index} className="flex items-start gap-2.5">
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0"></div>
                  <span className="text-sm text-gray-200 leading-relaxed 
                    md:text-base md:leading-normal 
                    xl:text-lg xl:leading-relaxed">
                    {msg}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* ✅ Final output — scales up gracefully */}
        <div className="whitespace-pre-wrap 
          text-base leading-relaxed 
          md:text-lg md:leading-normal 
          xl:text-xl xl:leading-relaxed 
          2xl:text-2xl 2xl:leading-normal
          text-gray-100">
          {finalOutput}
        </div>
      </div>
    </div>
  );
}
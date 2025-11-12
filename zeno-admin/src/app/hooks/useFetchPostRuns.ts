import { useEffect, useRef, useState } from "react";
import { createRun, fetchRunById } from "../utils/fetchPostRuns";
import { RunLike, RunFile, OutputArtifact } from "../utils/types/chat";

export function useRuns(user?: { id: number; token: string }) {
  const [runs, setRuns] = useState<RunLike[]>([]);
  const pollingRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const cleanupPolling = () => {
      pollingRef.current.forEach(clearInterval);
      pollingRef.current.clear();
    };
    return cleanupPolling;
  }, []);

  const normalizeRun = (run: Partial<RunLike>): RunLike => ({
    id: run.id || String(Date.now()),
    user_input: run.user_input || "",
    status: (run.status || "pending").toLowerCase(),
    final_output: run.final_output === undefined ? null : run.final_output,
    output_artifacts: Array.isArray(run.output_artifacts) ? run.output_artifacts : [],
    started_at: run.started_at || new Date().toISOString(),
    error: run.error,
    _thinkingContent: run._thinkingContent || "",
    _progressMessages: run._progressMessages || [],
  });

  const extractLiveContent = (artifacts: OutputArtifact[]) => {
    const thinking: string[] = [];
    const progress: string[] = [];

    console.log('🔍 Extracting live content from artifacts:', artifacts);

    artifacts.forEach((artifact, index) => {
      console.log(`  Artifact ${index}:`, { 
        type: artifact.artifact_type, 
        data: artifact.data 
      });

      if (artifact.artifact_type === "thinking") {
        // Handle all possible thinking formats
        if (typeof artifact.data === "string") {
          thinking.push(artifact.data);
        } else if (artifact.data && typeof artifact.data === "object") {
          const content = (artifact.data as any).content;
          if (content) thinking.push(content);
        }
      } else if (artifact.artifact_type === "progress") {
        // Handle all possible progress formats
        if (typeof artifact.data === "string") {
          progress.push(artifact.data);
        } else if (artifact.data && typeof artifact.data === "object") {
          const message = (artifact.data as any).message;
          if (message) progress.push(message);
        }
      }
    });

    console.log('✅ Extracted content:', { 
      thinkingLength: thinking.length, 
      progressLength: progress.length,
      thinkingPreview: thinking.join('').slice(0, 100),
      progressMessages: progress
    });

    return { 
      thinkingContent: thinking.join(""), 
      progressMessages: progress 
    };
  };

  async function sendMessage({
    conversationId,
    userInput,
    files = [],
    filePreviews,
  }: {
    conversationId?: string | null;
    userInput: string;
    files?: File[];
    filePreviews?: RunFile[];
  }): Promise<RunLike> {
    const tempId = "temp-" + Date.now();
    const optimisticFiles = filePreviews || files.map((file) => ({ file, previewUrl: "" }));
    const displayInput = files.length > 0 ? files.map((file) => file.name).join(", ") : userInput;

    setRuns((runs) =>
      runs.concat({
        id: tempId,
        user_input: displayInput,
        status: "pending",
        final_output: null,
        output_artifacts: [],
        started_at: new Date().toISOString(),
        _optimistic: true,
        files: optimisticFiles,
        _thinkingContent: "",
        _progressMessages: [],
      })
    );

    try {
      const incomingRun = await createRun(conversationId || null, userInput, user?.token, files);
      console.log('📥 Received run from createRun:', incomingRun);
      
      const normalized = normalizeRun(incomingRun);

      setRuns((prevRuns) =>
        prevRuns.map((run) => {
          if (run.id === tempId) {
            const updated = Object.assign({}, normalized);
            updated.files = run.files;
            return updated;
          }
          return run;
        })
      );

      const runId = Number(incomingRun.id);
      if (runId > 0) {
        console.log('🔄 Starting polling for run:', runId);
        startPolling(runId);
      }

      return normalized;
    } catch (err) {
      const message = (err as { message?: string }).message || String(err);
      setRuns((prevRuns) =>
        prevRuns.map((run) => {
          if (run.id === tempId) {
            const failedRun = Object.assign({}, run);
            failedRun.status = "failed";
            failedRun.error = message;
            return failedRun;
          }
          return run;
        })
      );
      throw err;
    }
  }

  const startPolling = (runId: number) => {
    if (pollingRef.current.has(runId)) {
      console.log('⚠️ Already polling run:', runId);
      return;
    }

    console.log('▶️ Starting polling for run:', runId);

    const intervalId = window.setInterval(async () => {
      try {
        const updated = normalizeRun(await fetchRunById(runId, user?.token));
        console.log('📊 Polling update for run', runId, ':', {
          status: updated.status,
          artifactsCount: updated.output_artifacts?.length || 0,
          hasFinalOutput: !!updated.final_output
        });

        const { thinkingContent, progressMessages } = extractLiveContent(updated.output_artifacts || []);

        setRuns((prevRuns) =>
          prevRuns.map((run) => {
            if (Number(run.id) === runId) {
              const merged = Object.assign({}, run, updated);
              merged.files = run.files;
              merged._thinkingContent = thinkingContent;
              merged._progressMessages = progressMessages;
              return merged;
            }
            return run;
          })
        );

        if (updated.status === "completed" || updated.status === "failed") {
          console.log('✋ Stopping polling for run', runId, '- status:', updated.status);
          clearInterval(intervalId);
          pollingRef.current.delete(runId);
        }
      } catch (error) {
        console.error('❌ Polling error for run', runId, ':', error);
        clearInterval(intervalId);
        pollingRef.current.delete(runId);
      }
    }, 700);

    pollingRef.current.set(runId, intervalId);
  };

  const clearRuns = () => {
    setRuns([]);
    pollingRef.current.forEach(clearInterval);
    pollingRef.current.clear();
  };

  return { runs, sendMessage, clearRuns, setRuns };
}
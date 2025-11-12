import { useState, useEffect, useCallback } from 'react';
import { RunLike } from '../utils/types/chat';

interface StreamedRunState {
  status: 'pending' | 'running' | 'completed' | 'failed';
  thinkingContent: string;
  progressMessages: string[];
  finalOutput: string | null;
  error: string | null;
}

export function useStreamedRun() {
  const [state, setState] = useState<StreamedRunState>({
    status: 'pending',
    thinkingContent: '',
    progressMessages: [],
    finalOutput: null,
    error: null,
  });

  const streamRun = useCallback(async (
    userInput: string,
    token: string,
    onFinal?: (run: RunLike) => void
  ) => {
    setState({
      status: 'pending',
      thinkingContent: '',
      progressMessages: [],
      finalOutput: null,
      error: null,
    });

    const controller = new AbortController();
    const { signal } = controller;

    try {
      const response = await fetch('/api/query-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ query: userInput }),
        signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setState((prev) => ({ ...prev, status: 'running' }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by newline — each line is a JSON event
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);
            // console.log('▶️ Stream event:', event);

            setState((prev) => {
              let newState = { ...prev };

              if (event.type === 'progress') {
                return {
                  ...newState,
                  progressMessages: [...prev.progressMessages, event.message],
                };
              }

              if (event.type === 'thinking' && event.content) {
                return {
                  ...newState,
                  thinkingContent: prev.thinkingContent + event.content,
                };
              }

              if (event.type === 'final' && event.response) {
                const finalOutput = event.response;
                const completedRun: RunLike = {
                  id: 'streamed-' + Date.now(),
                  user_input: userInput,
                  status: 'completed',
                  final_output: finalOutput,
                  output_artifacts: [],
                  started_at: new Date().toISOString(),
                  _thinkingContent: prev.thinkingContent,
                  _progressMessages: prev.progressMessages,
                };

                if (onFinal) onFinal(completedRun);
                return {
                  ...newState,
                  status: 'completed',
                  finalOutput,
                };
              }

              if (event.type === 'error') {
                return {
                  ...newState,
                  status: 'failed',
                  error: event.message,
                };
              }

              return newState;
            });
          } catch (parseErr) {
            console.warn('Failed to parse stream line:', line, parseErr);
          }
        }
      }

      // If stream ends without 'final', mark as completed
      if (state.status === 'running') {
        setState((prev) => ({ ...prev, status: 'completed' }));
      }
    } catch (err: any) {
      if (signal.aborted) return;
      console.error('Stream error:', err);
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: err.message || 'Stream failed',
      }));
    }

    return () => controller.abort();
  }, []);

  return { ...state, streamRun };
}
export interface OutputArtifact {
  id?: string | number;
  artifact_type: "text" | "chart" | "table" | "progress" | "thinking";
  data: ChartData | TableData | string;
  title?: string;
}

export type Run = {
  id: number;
  user_input: string;
  status: "pending" | "completed" | "failed";
  final_output?: string;
  output_artifacts?: OutputArtifact[];
  files?: File[];
};

export type ChatMessageProps = {
  role: "user" | "agent";
  text?: string;
  artifactType?: "text" | "chart" | "table" | "progress" | "thinking";
  artifactData?: ChartData | TableData | string;
  loading?: boolean;
  runId?: string | number;
  userId?: number;
};

export type TableData = {
  columns?: string[];
  rows?: (string | number)[][];
  x?: (string | number)[];
  y?: (string | number)[];
  title?: string;
};

export type ChartData = {
  x: (string | number)[];
  y: number[];
  title?: string;
  chart_type?: "bar" | "line" | "pie";
};

export type ArtifactRendererProps = {
  artifactType: "chart" | "table" | "text" | "progress" | "thinking";
  artifactData: ChartData | TableData | string;
  text?: string;
};

export interface RunFile {
  file: File;
  previewUrl: string;
}

export interface RunLike {
  id: number | string;
  user_input: string;
  status: string;
  final_output: string | null;
  output_artifacts: OutputArtifact[];
  started_at: string;
  _optimistic?: boolean;
  files?: RunFile[];
  error?: string;

  // Optional fields for streaming updates
  _thinkingContent?: string;      // concatenated "thinking" artifact data
  _progressMessages?: string[];   // array of "progress" steps
}

export interface FileWithPreview {
  file: File;
  previewUrl: string;
}

export interface ChatInputProps {
  conversationId?: string | null;
  user: { id: number; token: string };
  sendMessage: (params: {
    conversationId?: string | null;
    userInput: string;
    files?: File[];
    filePreviews?: { file: File; previewUrl: string }[];
  }) => Promise<RunLike>;
  onRunCreated?: (run: RunLike) => void;
}

export type ChatMessagesProps = {
  runs: RunLike[];
  onRetry?: (run: RunLike) => void;
  userId?: number;
  runLimitError?: boolean;
};

export type Conversation = {
  conversation_id: number;
  title: string;
  runs: Run[];
  created_at: string;
};

export interface UserMessageProps {
  text: string;
  files?: RunFile[];
}

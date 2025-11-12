const API_BASE = '/api';

export interface RunResponse {
  [key: string]: unknown;
}

// Helper to normalize artifacts for consistent frontend consumption
function normalizeArtifacts(artifacts: any[] = []) {
  return artifacts.map((artifact) => {
    const { artifact_type, data } = artifact;
    
    // Ensure data is in a consistent format
    let normalizedData = data;
    
    if (artifact_type === 'thinking') {
      // Handle various thinking formats
      if (typeof data === 'string') {
        normalizedData = { content: data };
      } else if (data?.steps && Array.isArray(data.steps)) {
        normalizedData = { content: data.steps.join('\n') };
      } else if (data?.content) {
        normalizedData = { content: data.content };
      } else {
        // Fallback: stringify the data
        normalizedData = { content: JSON.stringify(data) };
      }
    } else if (artifact_type === 'progress') {
      // Handle various progress formats
      if (typeof data === 'string') {
        normalizedData = { message: data };
      } else if (data?.message) {
        normalizedData = { message: data.message };
      } else if (data?.content) {
        normalizedData = { message: data.content };
      } else {
        normalizedData = { message: JSON.stringify(data) };
      }
    }

    return {
      ...artifact,
      data: normalizedData
    };
  });
}

export async function createRun(
  conversationId: string | null,
  userInput: string,
  token?: string,
  files?: File[]
): Promise<RunResponse> {
  if (!token) throw new Error('Please log in.');

  const headers: HeadersInit = { 'Authorization': `Token ${token}` };
  let body: BodyInit;

  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('user_input', userInput);
    if (conversationId) formData.append('conversation_id', conversationId);
    files.forEach(file => formData.append('files', file));
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ conversation_id: conversationId, user_input: userInput });
  }

  const response = await fetch(`${API_BASE}/runs/`, { method: 'POST', headers, body });

  let data: RunResponse;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    const errorMessage =
      (data as { error?: string })?.error ||
      (data as { message?: string })?.message ||
      (data as { detail?: string })?.detail ||
      `Failed to create run (status ${response.status})`;
    throw new Error(errorMessage);
  }

  // Normalize artifacts
  if (data.output_artifacts && Array.isArray(data.output_artifacts)) {
    data.output_artifacts = normalizeArtifacts(data.output_artifacts);
  }

  return data;
}

export async function fetchRunById(runId: number, token?: string): Promise<RunResponse> {
  if (!token) throw new Error('Please log in.');

  const headers: HeadersInit = { 'Authorization': `Token ${token}` };
  const response = await fetch(`${API_BASE}/runs/${runId}/`, { headers });

  let data: RunResponse;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    const errorMessage = (data as { message?: string })?.message || `Failed to fetch run (status ${response.status})`;
    throw new Error(errorMessage);
  }

  // Normalize artifacts for frontend streaming
  if (data.output_artifacts && Array.isArray(data.output_artifacts)) {
    data.output_artifacts = normalizeArtifacts(data.output_artifacts);
  }

  return data;
}
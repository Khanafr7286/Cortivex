import type {
  PipelineDefinition,
  PipelineRun,
  MeshClaim,
  MeshConflict,
  Insight,
  ExecutionRecord,
} from './types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(response.status, `API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Network error or server unreachable - return empty data
    console.warn(`API request failed for ${path}:`, error);
    throw error;
  }
}

// ============================================
// PIPELINE API
// ============================================

export async function fetchPipelines(): Promise<PipelineDefinition[]> {
  return request<PipelineDefinition[]>('/pipelines?full=true');
}

export async function fetchPipeline(name: string): Promise<PipelineDefinition> {
  return request<PipelineDefinition>(`/pipelines/${encodeURIComponent(name)}`);
}

export async function savePipeline(pipeline: PipelineDefinition): Promise<void> {
  await request(`/pipelines/${encodeURIComponent(pipeline.name)}`, {
    method: 'PUT',
    body: JSON.stringify(pipeline),
  });
}

export async function runPipeline(name: string): Promise<PipelineRun> {
  return request<PipelineRun>(`/pipelines/${encodeURIComponent(name)}/run`, {
    method: 'POST',
  });
}

export async function fetchRun(runId: string): Promise<PipelineRun> {
  return request<PipelineRun>(`/runs/${runId}`);
}

// ============================================
// MESH API
// ============================================

export async function fetchMeshClaims(): Promise<MeshClaim[]> {
  return request<MeshClaim[]>('/mesh/claims');
}

export async function fetchMeshConflicts(): Promise<MeshConflict[]> {
  return request<MeshConflict[]>('/mesh/conflicts');
}

// ============================================
// LEARNING API
// ============================================

export async function fetchInsights(): Promise<Insight[]> {
  return request<Insight[]>('/learning/insights');
}

export async function fetchHistory(): Promise<ExecutionRecord[]> {
  return request<ExecutionRecord[]>('/learning/history');
}

// ============================================
// POLLING FALLBACK
// ============================================

export class Poller {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(callback: () => void, intervalMs: number = 2000): void {
    this.stop();
    this.intervalId = setInterval(callback, intervalMs);
    // Run immediately
    callback();
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  get isRunning(): boolean {
    return this.intervalId !== null;
  }
}

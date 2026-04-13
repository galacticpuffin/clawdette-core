export type ZoomLevel = "far" | "mid" | "close";

export type AgentRegion =
  | "executive"
  | "strategy"
  | "operations"
  | "engineering"
  | "security"
  | "creative"
  | "memory"
  | "dispatch"
  | "life"
  | "monitor";

export type AgentStatus = "idle" | "thinking" | "executing" | "monitoring";

export interface PermissionCapability {
  key: string;
  label: string;
  allowed: boolean;
}

export interface AgentNode {
  id: string;
  name: string;
  title: string;
  region: AgentRegion;
  mission: string;
  tools: string[];
  linkedAgents: string[];
  permissions: PermissionCapability[];
  status: AgentStatus;
  load: number;
  signal: number;
  position: [number, number, number];
  color: string;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  author: "user" | "agent" | "system";
  agentId: string;
  content: string;
  createdAt: string;
  state?: string;
  linkedAgents?: string[];
  output?: string;
}

export interface AgentThread {
  id: string;
  agentId: string;
  title: string;
  updatedAt: string;
  messages: ThreadMessage[];
}

export interface MemoryArtifact {
  id: string;
  layer:
    | "executive"
    | "session"
    | "project"
    | "life_admin"
    | "task"
    | "state_snapshot"
    | "continuation";
  title: string;
  summary: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NeuralSignal {
  id: string;
  from: string;
  to: string;
  intensity: number;
  label: string;
}

export interface CoreState {
  version: number;
  systemName: string;
  updatedAt: string;
  zoom: ZoomLevel;
  activeAgentId: string;
  ambientMode: "dreaming" | "operating" | "alert";
  agents: AgentNode[];
  signals: NeuralSignal[];
  memoryArtifacts: MemoryArtifact[];
}

export interface SavePayload {
  state: CoreState;
  reason: "interval" | "interaction" | "checkpoint" | "startup";
}

export interface TranscriptionResult {
  text: string;
  durationMs?: number;
  storedArtifactId?: string;
}

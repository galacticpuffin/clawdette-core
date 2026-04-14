export type ZoomLevel = "far" | "mid" | "close";

export type SystemMode = "CALM" | "ACTIVE" | "ALERT" | "FOCUS" | "EMERGENCY";

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

export type UrgencyLevel = "passive" | "summary" | "active" | "urgent";

export type TaskStatus =
  | "captured"
  | "queued"
  | "researching"
  | "active"
  | "waiting"
  | "done"
  | "escalated";

export type NotificationChannel = "in_app" | "sms" | "email" | "call";

export type ReasoningSourceType = "global_knowledge" | "local_memory" | "behavioral_intent";

export type AdaptationEventType =
  | "capture"
  | "revisit_task"
  | "select_agent"
  | "message"
  | "complete_task"
  | "ignore_task"
  | "checkpoint";

export interface WorkspaceProfile {
  id: string;
  label: string;
  mode: "personal" | "future_multi_user";
  ownerId: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  archetype: "adhd_founder" | "operator" | "builder";
}

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

export interface ReasoningSource {
  type: ReasoningSourceType;
  confidence: number;
  summary: string;
}

export interface ReasoningTrace {
  id: string;
  leadAgentId: string;
  supportingAgentIds: string[];
  verdict: string;
  consensusScore: number;
  sources: ReasoningSource[];
  createdAt: string;
}

export interface PathwayStrength {
  id: string;
  from: string;
  to: string;
  label: string;
  weight: number;
  salience: number;
  activations: number;
  successfulActivations: number;
  lastActivatedAt: string;
  decay: number;
  themeTags: string[];
}

export interface MemoryCluster {
  id: string;
  label: string;
  theme: string;
  strength: number;
  salience: number;
  taskIds: string[];
  memoryIds: string[];
  lastConsolidatedAt: string;
}

export interface BehavioralPattern {
  id: string;
  theme: string;
  count: number;
  momentum: number;
  emotionalWeight: number;
  lastSeenAt: string;
}

export interface CognitiveProfile {
  attentionStyle: "nonlinear" | "focused_burst" | "oscillating";
  distractibilityIndex: number;
  taskSwitchIntensity: number;
  revisitReliance: number;
  urgencySensitivity: number;
  preferredUpdateMode: "silent" | "digest" | "active";
  overfocusThemes: string[];
  avoidanceThemes: string[];
}

export interface AdaptationEvent {
  id: string;
  type: AdaptationEventType;
  createdAt: string;
  taskId?: string;
  agentId?: string;
  pathwayKey?: string;
  themeTags: string[];
  emotionalWeight: number;
  outcomeWeight: number;
  summary: string;
}

export interface NeuroplasticState {
  pathways: PathwayStrength[];
  memoryClusters: MemoryCluster[];
  behavioralPatterns: BehavioralPattern[];
  cognitiveProfile: CognitiveProfile;
  workingMemoryTaskIds: string[];
  longTermMemoryTaskIds: string[];
  adaptationLog: AdaptationEvent[];
}

export interface TaskThread {
  id: string;
  title: string;
  description: string;
  origin: "voice" | "quick_capture" | "thread" | "system";
  status: TaskStatus;
  urgency: UrgencyLevel;
  assignedAgentIds: string[];
  escalationChannels: NotificationChannel[];
  summary: string;
  nextStep: string;
  createdAt: string;
  updatedAt: string;
  dueHint?: string;
  sourceThreadId?: string;
  reasoningTrace?: ReasoningTrace;
  salience: number;
  revisitCount: number;
  completionScore: number;
  decay: number;
  emotionalWeight: number;
  themeTags: string[];
  dormant?: boolean;
  lastTouchedAt: string;
}

export interface NotificationEvent {
  id: string;
  title: string;
  body: string;
  urgency: UrgencyLevel;
  channels: NotificationChannel[];
  status: "pending" | "sent" | "stored";
  taskId?: string;
  createdAt: string;
}

export interface NeuralSignal {
  id: string;
  from: string;
  to: string;
  intensity: number;
  label: string;
  weight: number;
  decay: number;
  themeTags: string[];
}

export interface CoreState {
  version: number;
  systemName: string;
  updatedAt: string;
  zoom: ZoomLevel;
  systemMode: SystemMode;
  activeAgentId: string;
  activeTaskId?: string;
  workspace: WorkspaceProfile;
  activeUser: UserProfile;
  agents: AgentNode[];
  signals: NeuralSignal[];
  memoryArtifacts: MemoryArtifact[];
  taskThreads: TaskThread[];
  notifications: NotificationEvent[];
  neuroplasticity: NeuroplasticState;
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

export interface CaptureRequest {
  content: string;
  origin: TaskThread["origin"];
}

export interface CaptureResponse {
  task: TaskThread;
  notifications: NotificationEvent[];
  threadMessages: ThreadMessage[];
  systemMode: SystemMode;
}

export interface AdaptationRequest {
  type: AdaptationEventType;
  taskId?: string;
  agentId?: string;
  content?: string;
  emotionalWeight?: number;
  outcomeWeight?: number;
}

export interface Note {
  id: string;
  path: string;
  title: string;
  content: string;
  frontmatter: Frontmatter;
  tags: string[];
  backlinks: string[];
  outgoingLinks: string[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  modifiedAt: Date;
  fileSize: number;
  hash: string;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface Frontmatter {
  title?: string;
  created?: Date;
  updated?: Date;
  tags?: string[];
  aliases?: string[];
  cssclasses?: string[];
  publish?: boolean;
  [key: string]: unknown;
}

export interface Vault {
  id: string;
  name: string;
  path: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  noteCount: number;
  attachmentCount: number;
  totalSize: number;
  encryptionEnabled: boolean;
  syncEnabled: boolean;
  syncUrl?: string;
  settings: VaultSettings;
}

export interface VaultSettings {
  theme: "light" | "dark" | "system";
  editorFontSize: number;
  editorFontFamily: string;
  lineNumbers: boolean;
  spellCheck: boolean;
  showLineNumber: boolean;
  defaultNewNoteLocation: "root" | "current-folder";
  newFileExtension: ".md" | ".markdown";
  attachmentFolderPath: string;
  useMarkdownLinks: boolean;
  useWikiLinks: boolean;
  defaultViewMode: "source" | "preview";
  graphSettings: GraphSettings;
  syncSettings: SyncSettings;
  backupSettings: BackupSettings;
  securitySettings: SecuritySettings;
}

export interface GraphSettings {
  showOrphans: boolean;
  showAttachments: boolean;
  showTags: boolean;
  localGraphDepth: number;
  arrowHeadSize: number;
  linkDistance: number;
  repulsion: number;
  gravity: number;
}

export interface SyncSettings {
  enabled: boolean;
  serverUrl: string;
  authToken: string;
  syncInterval: number;
  autoSync: boolean;
  encryptBeforeSync: boolean;
  resolveConflicts: "local-wins" | "remote-wins" | "manual";
}

export interface BackupSettings {
  enabled: boolean;
  backupPath: string;
  backupInterval: number;
  maxBackups: number;
  compressBackups: boolean;
}

export interface SecuritySettings {
  vaultPassword?: string;
  autoLockTimeout: number;
  requirePasswordOnStart: boolean;
  encryptionEnabled: boolean;
}

export interface SyncMetadata {
  deviceId: string;
  deviceName: string;
  lastSyncAt: Date;
  syncVersion: number;
  pendingOperations: SyncOperation[];
  conflicts: SyncConflict[];
}

export interface SyncOperation {
  id: string;
  type: "create" | "update" | "delete";
  path: string;
  content?: string;
  hash: string;
  timestamp: Date;
  deviceId: string;
  status: "pending" | "synced" | "conflict" | "failed";
  retryCount: number;
}

export interface SyncConflict {
  id: string;
  path: string;
  localVersion: SyncVersion;
  remoteVersion: SyncVersion;
  createdAt: Date;
  resolved: boolean;
  resolution?: "local" | "remote" | "merged";
}

export interface SyncVersion {
  hash: string;
  content: string;
  deviceId: string;
  timestamp: Date;
  version: number;
}

export interface SyncRequest {
  deviceId: string;
  vaultId: string;
  lastSyncVersion: number;
  operations: SyncOperation[];
  clientVersion: number;
}

export interface SyncResponse {
  success: boolean;
  newSyncVersion: number;
  operations: SyncOperation[];
  conflicts: SyncConflict[];
  serverTime: Date;
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  salt: string;
  algorithm: "xchacha20-poly1305";
  version: number;
}

export interface EncryptedSyncPayload extends EncryptedPayload {
  deviceId: string;
  vaultId: string;
  syncVersion: number;
  operationCount: number;
}

export interface Device {
  id: string;
  name: string;
  platform: "desktop" | "mobile";
  lastSeenAt: Date;
  publicKey: string;
  registeredAt: Date;
}

export interface User {
  id: string;
  username: string;
  createdAt: Date;
  devices: Device[];
  vaults: string[];
}

export interface SearchResult {
  noteId: string;
  path: string;
  title: string;
  content: string;
  matches: Match[];
  score: number;
  tags: string[];
}

export interface Match {
  start: number;
  end: number;
  text: string;
  context: string;
}

export interface IndexEntry {
  id: string;
  path: string;
  title: string;
  tags: string[];
  backlinks: string[];
  outgoingLinks: string[];
  content: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "note" | "attachment" | "tag";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "link" | "backlink" | "tag";
  strength?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  minAppVersion: string;
  main: string;
  styles?: string[];
  permissions: string[];
}

export interface Plugin {
  manifest: PluginManifest;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface Command {
  id: string;
  name: string;
  description?: string;
  hotkey?: string;
  icon?: string;
  callback: () => void | Promise<void>;
}

export interface Theme {
  id: string;
  name: string;
  author: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  isDark: boolean;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  backgroundSecondary: string;
  foregroundSecondary: string;
  accent: string;
  accentHover: string;
  border: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  selection: string;
  highlight: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSizeSm: string;
  fontSizeBase: string;
  fontSizeLg: string;
  lineHeightBase: number;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface FileChangeEvent {
  type: "create" | "update" | "delete" | "rename";
  path: string;
  oldPath?: string;
  timestamp: Date;
}

export interface EditorState {
  activeNoteId: string | null;
  openNotes: string[];
  cursorPosition: { line: number; ch: number };
  selection: { from: number; to: number } | null;
  previewMode: boolean;
}

export interface SidebarState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  activeLeftPanel: "files" | "search" | "graph" | "backlinks" | "tags" | "outline";
  activeRightPanel: "backlinks" | "outline" | "tags" | "properties" | "sync";
  leftWidth: number;
  rightWidth: number;
}

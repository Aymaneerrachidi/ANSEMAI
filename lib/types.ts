export type OfficialLink = {
  label: string;
  url: string;
};

export type TrustedAccount = {
  handle: string;
  label: string;
  url: string;
};

export type AnnouncementSource = {
  label: string;
  type: "x" | "telegram" | "discord" | "website" | "other";
  url: string;
};

export type KnowledgeDocument = {
  title: string;
  kind: string;
  content: string;
};

export type KnownImpersonator = {
  label: string;
  kind: "domain" | "handle";
  pattern: string;
  note: string;
};

export type AnsemConfig = {
  projectName: string;
  officialContract: string;
  officialWebsite: string;
  officialDashboard: string;
  officialLinks: OfficialLink[];
  trustedXAccounts: TrustedAccount[];
  announcementSources: AnnouncementSource[];
  documents: KnowledgeDocument[];
  knownImpersonators?: KnownImpersonator[];
  apiKeys: {
    openai?: string;
    llmProvider?: string;
    llmApiKey?: string;
    llmBaseUrl?: string;
    llmModel?: string;
    cohereApiKey?: string;
    cohereBaseUrl?: string;
    cohereModel?: string;
    helius?: string;
    birdeye?: string;
    xApi?: string;
    redis?: string;
    supabaseUrl?: string;
    supabaseAnon?: string;
  };
};

export type Source = {
  title: string;
  url?: string;
  detail?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

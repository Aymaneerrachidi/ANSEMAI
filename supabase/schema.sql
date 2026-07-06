create extension if not exists vector;

create table if not exists ansem_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null,
  url text,
  is_official boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ansem_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references ansem_sources(id) on delete set null,
  title text not null unique,
  kind text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ansem_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists ansem_documents_embedding_idx
  on ansem_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

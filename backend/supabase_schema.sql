-- ==============================================================================
-- SCHEMA: CRM DE LEADS + HISTÓRICO DE CHAT (n8n + Zapi + Supabase)
-- Execute no SQL Editor do projeto Supabase.
-- Complementa o supabase_setup.sql existente (tabela diagnosticos).
-- ==============================================================================


-- ============================================================
-- TABELA 1: leads
-- Armazena cada lead captado via webhook da Zapi.
-- lead_id = número de telefone no formato E.164 (+5511999998888)
-- ============================================================

CREATE TABLE public.leads (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    lead_nome     TEXT,
    lead_id       TEXT NOT NULL UNIQUE   -- número de telefone (identificador Zapi)
);

-- Índice para lookup rápido por número de telefone (chave usada pelo n8n em toda mensagem)
CREATE INDEX idx_leads_lead_id ON public.leads (lead_id);

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Inserção permitida apenas via service_role (n8n usa a service key no backend)
-- Nenhuma política de SELECT é criada para anon/authenticated.


-- ============================================================
-- TABELA 2: chat_histories
-- Armazena o histórico completo de mensagens por sessão.
-- Usada pelo nó de Supabase Chat Memory do n8n.
-- session_id = lead_id (telefone) ou combinação lead_id+contexto.
-- ============================================================

CREATE TABLE public.chat_histories (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id           TEXT NOT NULL,              -- referência ao lead_id da tabela leads
    hora_data_mensagem   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    role                 TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message              JSONB NOT NULL,             -- { "type": "text"|"audio", "content": "..." }
    metadata             JSONB DEFAULT '{}'::jsonb  -- canal, agente ativo, tag SDR, etc.
);

-- Índice para recuperar todo o histórico de uma sessão ordenado por tempo
CREATE INDEX idx_chat_histories_session ON public.chat_histories (session_id, hora_data_mensagem);

-- RLS
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- FOREIGN KEY (opcional — ativar após popular a tabela leads)
-- Garante que toda sessão de chat pertence a um lead cadastrado.
-- ============================================================

-- ALTER TABLE public.chat_histories
--     ADD CONSTRAINT fk_chat_lead
--     FOREIGN KEY (session_id) REFERENCES public.leads (lead_id)
--     ON DELETE CASCADE;


-- ============================================================
-- VIEWS ÚTEIS PARA O DASHBOARD / n8n
-- ============================================================

-- Última mensagem de cada sessão (útil para listar conversas ativas)
CREATE OR REPLACE VIEW public.vw_ultimas_mensagens AS
SELECT DISTINCT ON (session_id)
    session_id,
    hora_data_mensagem,
    role,
    message ->> 'content' AS ultimo_conteudo,
    metadata
FROM public.chat_histories
ORDER BY session_id, hora_data_mensagem DESC;

-- Contagem de mensagens por lead (métricas de engajamento)
CREATE OR REPLACE VIEW public.vw_engajamento_leads AS
SELECT
    l.lead_id,
    l.lead_nome,
    l.created_at AS lead_criado_em,
    COUNT(c.id)                                         AS total_mensagens,
    MAX(c.hora_data_mensagem)                           AS ultima_interacao,
    COUNT(c.id) FILTER (WHERE c.role = 'user')          AS mensagens_lead,
    COUNT(c.id) FILTER (WHERE c.role = 'assistant')     AS mensagens_agente
FROM public.leads l
LEFT JOIN public.chat_histories c ON c.session_id = l.lead_id
GROUP BY l.lead_id, l.lead_nome, l.created_at;

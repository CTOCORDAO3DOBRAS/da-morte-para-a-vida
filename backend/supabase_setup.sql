-- ==============================================================================
-- FASE 2: SCRIPT SQL PARA O SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ==============================================================================

-- 1. Criar a tabela principal para armazenar os diagnósticos anonimamente
CREATE TABLE public.diagnosticos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    casado BOOLEAN,
    perfil_resultado TEXT NOT NULL,
    pontuacao_eixo1 NUMERIC,
    pontuacao_eixo2 NUMERIC,
    pontuacao_eixo3 NUMERIC,
    respostas JSONB DEFAULT '{}'::jsonb
);

-- 2. Ativar a Segurança em Nível de Linha (RLS - Row Level Security)
-- Isso garante que, por padrão, ninguém tenha acesso aos dados.
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;

-- 3. Criar Política de Inserção (INSERT) para usuários Anônimos
-- Permite que o frontend (usando a chave ANON) consiga inserir novos diagnósticos.
CREATE POLICY "Permitir insercao anonima" ON public.diagnosticos
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- NOTA SOBRE LEITURA (SELECT):
-- Não vamos criar uma política de SELECT para 'anon' ou 'authenticated', 
-- para garantir que o frontend público nunca possa ler a tabela.
-- Nosso Dashboard Administrativo usará a "service_role_key" do Supabase
-- no servidor Node.js (backend), que tem permissões de superusuário e 
-- ignora as restrições do RLS automaticamente.

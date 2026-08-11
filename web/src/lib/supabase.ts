import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // Não lançamos erro aqui para permitir que a UI renderize uma tela de
  // configuração amigável em vez de uma tela branca — ver src/App.tsx.
  console.warn(
    '[NEXUS] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. ' +
      'Copie web/.env.example para web/.env e preencha com os dados do seu projeto Supabase.'
  );
}

// Sem o generic `Database` de propósito — ver o comentário em
// src/types/database.ts (TableRowMap) para o porquê. Cada chamada tipa seu
// próprio resultado via `TableRowMap` ou os hooks em src/hooks/useCrud.ts.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key');

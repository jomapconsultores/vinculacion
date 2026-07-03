-- ============================================================
-- 0009 — Evaluación psicométrica voluntaria (Perfil Psicolaboral)
-- ============================================================
-- Prueba de autoaplicación, voluntaria, para graduados/estudiantes/profesionales.
-- Contenido del instrumento y cálculo de puntajes en src/lib/psicometria.ts.
-- Visibilidad: la propia persona (dueña) y el staff (admin/autoridad) vía is_staff().
-- Ningún empleador ni otro graduado puede leer esta tabla.

create table if not exists psicometria_resultados (
  id             bigint generated always as identity primary key,
  profile_id     uuid not null references profiles(id) on delete cascade,
  tipo           text not null default 'perfil_psicolaboral',
  respuestas     jsonb not null default '{}'::jsonb,   -- item_id -> 1..5 (crudo, sin invertir)
  puntuaciones   jsonb not null default '{}'::jsonb,   -- dimension -> { promedio, banda }
  interpretacion jsonb not null default '{}'::jsonb,   -- dimension -> texto; incluye resumen general
  alerta         boolean not null default false,       -- riesgo psicosocial elevado: sugiere acompañamiento
  created_at     timestamptz not null default now()
);

alter table psicometria_resultados enable row level security;

do $$ begin
  create policy psico_owner on psicometria_resultados for all
    using (profile_id = auth.uid()) with check (profile_id = auth.uid());
  create policy psico_staff_read on psicometria_resultados for select using (is_staff());
exception when duplicate_object then null; end $$;

create index if not exists idx_psico_profile on psicometria_resultados(profile_id, created_at desc);

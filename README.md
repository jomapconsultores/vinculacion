# Proyecto Conecta

Plataforma institucional de **vinculación con graduados**. Demo de consultoría con cuatro pilares
sobre una **única base de datos viva** de personas e instituciones.

## Pilares
1. **Alumni / Seguimiento a Graduados** — registro único e identidad verificada, trayectoria profesional.
2. **Inserción Laboral** — bolsa de empleo con empresas validadas, match de competencias por IA y ferias.
3. **Servicios Comunitarios** — monitoreo académico–financiero de los 16 servicios (horas docentes vs. atención real) y prácticas preprofesionales.
4. **Trazabilidad e Indicadores** — indicadores de acreditación, tableros para autoridades, trazabilidad del estudiante al empleador.

## Flujo estrella (Pilar 2)
Registro verificado por correo → perfil **autollenado** desde el padrón (nombre, cédula, carrera, título) →
**CV generado con IA** → postulación con **match de competencias** → si falta una competencia, la IA sugiere el
**curso de educación continua** → al aprobarlo, la **universidad avala la competencia** → habilitado para postular →
el **empleador** rankea candidatos con IA.

## Stack
- Next.js 14 (App Router, TypeScript) + Tailwind
- Supabase (Auth con verificación por correo, Postgres, RLS)
- Claude API (`@anthropic-ai/sdk`) para CV, match de competencias y ranking de candidatos
- Despliegue: Coolify (Dockerfile) + Cloudflare (subdominio)

## Puesta en marcha (local)
```bash
npm install
cp .env.example .env.local   # completa las variables
npm run dev
```

### Variables de entorno
| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (solo servidor) |
| `ANTHROPIC_API_KEY` | Clave de Claude (funciones de IA) |
| `ANTHROPIC_MODEL` | Modelo (por defecto `claude-sonnet-5`) |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio |

### Base de datos
Las migraciones están en `supabase/migrations/` (esquema, RLS y semillas). Aplícalas en orden
(`0001` → `0002` → `0003`). Configura en Supabase Auth el **Site URL** y el redirect `…/auth/callback`.

## Cuentas de prueba (padrón sembrado)
Al registrarte como **graduado** con una de estas cédulas, el sistema autollena tus datos:

| Cédula | Graduado | Carrera |
|---|---|---|
| `0102030405` | María Fernanda Guamán | Ingeniería en Software |
| `0203040506` | Juan Carlos Pérez | Contabilidad y Auditoría |
| `0304050607` | Andrea Estefanía Morocho | Enfermería |
| `0405060708` | Luis Alberto Sánchez | Derecho |
| `0506070809` | Gabriela Nicole Vásquez | Marketing |
| `0607080910` | Diego Armando Quizhpi | Psicología Clínica |

> Nota: "Aprobar" un curso en el demo simula la culminación y el aval institucional de la competencia.

## Roles
- **graduado** — perfil, CV, empleos, competencias, cursos (`/dashboard`).
- **empleador** — ofertas, candidatos, ranking IA (`/empleador`).
- **autoridad / admin** — servicios, prácticas, indicadores (`/admin`).

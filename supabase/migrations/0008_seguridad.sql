-- ============================================================
-- 0008 — Correcciones de seguridad y de vistas
-- 1. Impedir que un usuario cambie su propio rol/aprobado/empresa_id
-- 2. Acotar la lectura de perfiles de empleadores a sus postulantes
-- 3. Cerrar el INSERT abierto de retroalimentacion_empresa
-- 4. Actualizar vistas que aún filtran por el rol obsoleto 'graduado'
-- ============================================================

-- ------------------------------------------------------------
-- 1. Escalada de privilegios: la política profiles_update_self permite
--    actualizar cualquier columna. Un trigger revierte los campos
--    sensibles cuando quien edita es un usuario autenticado no-staff.
--    (service_role -> auth.uid() NULL -> se permite; staff -> se permite.)
-- ------------------------------------------------------------
create or replace function protect_profile_privileges()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.rol       := old.rol;
    new.aprobado  := old.aprobado;
    new.empresa_id := old.empresa_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile_privileges on profiles;
create trigger trg_protect_profile_privileges
  before update on profiles
  for each row execute function protect_profile_privileges();

-- ------------------------------------------------------------
-- 2. Un empleador NO debe leer todos los perfiles. Solo los de
--    quienes postularon a un empleo de su propia empresa.
-- ------------------------------------------------------------
create or replace function es_postulante_de_mi_empresa(p_profile uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from postulaciones po
    join empleos e   on e.id = po.empleo_id
    join profiles emp on emp.id = auth.uid()
    where po.profile_id = p_profile
      and emp.rol = 'empleador'
      and emp.empresa_id is not null
      and e.empresa_id = emp.empresa_id
  );
$$;

-- profiles
drop policy if exists profiles_read_staff_emp on profiles;
do $$ begin
  create policy profiles_read_staff on profiles for select using (is_staff());
  create policy profiles_read_emp_postulantes on profiles for select
    using (es_postulante_de_mi_empresa(id));
exception when duplicate_object then null; end $$;

-- experiencia_laboral
drop policy if exists exp_read_staff_emp on experiencia_laboral;
do $$ begin
  create policy exp_read_staff on experiencia_laboral for select using (is_staff());
  create policy exp_read_emp on experiencia_laboral for select
    using (es_postulante_de_mi_empresa(profile_id));
exception when duplicate_object then null; end $$;

-- educacion
drop policy if exists edu_read_staff_emp on educacion;
do $$ begin
  create policy edu_read_staff on educacion for select using (is_staff());
  create policy edu_read_emp on educacion for select
    using (es_postulante_de_mi_empresa(profile_id));
exception when duplicate_object then null; end $$;

-- habilidades
drop policy if exists hab_read_staff_emp on habilidades;
do $$ begin
  create policy hab_read_staff on habilidades for select using (is_staff());
  create policy hab_read_emp on habilidades for select
    using (es_postulante_de_mi_empresa(profile_id));
exception when duplicate_object then null; end $$;

-- competencias_graduado
drop policy if exists compg_read_staff_emp on competencias_graduado;
do $$ begin
  create policy compg_read_staff on competencias_graduado for select using (is_staff());
  create policy compg_read_emp on competencias_graduado for select
    using (es_postulante_de_mi_empresa(profile_id));
exception when duplicate_object then null; end $$;

-- cvs
drop policy if exists cv_read_staff_emp on cvs;
do $$ begin
  create policy cv_read_staff on cvs for select using (is_staff());
  create policy cv_read_emp on cvs for select
    using (es_postulante_de_mi_empresa(profile_id));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 3. retroalimentacion_empresa: el INSERT solo evaluaba WITH CHECK (true).
--    Se exige que la postulación pertenezca a un empleo de la empresa
--    del empleador (o que sea staff).
-- ------------------------------------------------------------
drop policy if exists retro_emp on retroalimentacion_empresa;
do $$ begin
  create policy retro_emp on retroalimentacion_empresa for all
    using (is_staff() or exists (
      select 1 from postulaciones p join empleos e on e.id = p.empleo_id
      join profiles pr on pr.empresa_id = e.empresa_id
      where p.id = retroalimentacion_empresa.postulacion_id and pr.id = auth.uid()))
    with check (is_staff() or exists (
      select 1 from postulaciones p join empleos e on e.id = p.empleo_id
      join profiles pr on pr.empresa_id = e.empresa_id
      where p.id = retroalimentacion_empresa.postulacion_id and pr.id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 4. Vistas que quedaron con el rol obsoleto 'graduado' (renombrado a
--    'profesional' en 0005). Sin esto los indicadores salen en 0.
-- ------------------------------------------------------------
create or replace view v_indicadores_globales as
select
  (select count(*) from profiles where rol='profesional') as total_graduados,
  (select count(*) from profiles where rol='profesional' and origen_padron) as graduados_verificados,
  (select count(*) from empleos where estado='publicado') as empleos_activos,
  (select count(*) from postulaciones) as postulaciones_totales,
  (select count(*) from postulaciones where estado='contratado') as contratados,
  (select count(*) from competencias_graduado where estado='avalada') as competencias_avaladas,
  (select count(*) from servicios where activo) as servicios_activos;

create or replace view v_empleabilidad_carrera as
with grads as (
  select p.id, p.carrera_id from profiles p where p.rol = 'profesional'
)
select
  c.id,
  c.nombre as carrera,
  c.facultad,
  (select count(*) from grads g where g.carrera_id = c.id) as graduados,
  (select count(distinct po.profile_id) from postulaciones po
     join grads g on g.id = po.profile_id where g.carrera_id = c.id) as postulantes,
  (select count(distinct po.profile_id) from postulaciones po
     join grads g on g.id = po.profile_id where g.carrera_id = c.id and po.estado = 'contratado') as contratados,
  (select count(*) from competencias_graduado cg
     join grads g on g.id = cg.profile_id where g.carrera_id = c.id and cg.estado = 'avalada') as competencias_avaladas
from carreras c
order by c.nombre;

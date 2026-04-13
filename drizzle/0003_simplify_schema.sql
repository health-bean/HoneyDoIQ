-- ============================================================================
-- Migration: Simplify schema for V1 residential focus
-- Drops: rooms table, task_templates table, ownerRole, unused home columns,
--         non-residential home types
-- ============================================================================

-- ── Drop rooms table (unused in V1) ──────────────────────────────────────────
-- First drop RLS policies
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete" ON public.rooms;

-- Drop FK references to rooms from other tables
ALTER TABLE public.appliances DROP COLUMN IF EXISTS room_id;
ALTER TABLE public.task_instances DROP COLUMN IF EXISTS room_id;

-- Drop the table and enum
DROP TABLE IF EXISTS public.rooms;
DROP TYPE IF EXISTS public.room_type;

-- ── Drop task_templates table (templates are defined in code) ────────────────
DROP POLICY IF EXISTS "task_templates_select" ON public.task_templates;

-- Drop FK reference from task_instances
DROP INDEX IF EXISTS task_instances_template_id_idx;
ALTER TABLE public.task_instances DROP COLUMN IF EXISTS template_id;

-- Drop the table and related enum
DROP TABLE IF EXISTS public.task_templates;
DROP TYPE IF EXISTS public.diy_difficulty;

-- ── Drop ownerRole from homes ────────────────────────────────────────────────
ALTER TABLE public.homes DROP COLUMN IF EXISTS owner_role;
DROP TYPE IF EXISTS public.home_role;

-- ── Drop unused home columns ─────────────────────────────────────────────────
ALTER TABLE public.homes DROP COLUMN IF EXISTS address_line1;
ALTER TABLE public.homes DROP COLUMN IF EXISTS address_line2;
ALTER TABLE public.homes DROP COLUMN IF EXISTS city;
ALTER TABLE public.homes DROP COLUMN IF EXISTS country;
ALTER TABLE public.homes DROP COLUMN IF EXISTS ownership_date;

-- ── Trim home_type enum to residential only ──────────────────────────────────
-- PostgreSQL can't remove values from enums, so we recreate it
ALTER TABLE public.homes ALTER COLUMN type SET DATA TYPE text;
DROP TYPE public.home_type;
CREATE TYPE public.home_type AS ENUM ('single_family', 'townhouse', 'condo');
ALTER TABLE public.homes ALTER COLUMN type SET DATA TYPE public.home_type
  USING type::public.home_type;

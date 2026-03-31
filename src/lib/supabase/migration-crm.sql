-- ============================================================================
-- MapKo — CRM Migration
-- ============================================================================
-- Run this file in the Supabase SQL Editor to add CRM fields to the
-- businesses table (lead status, notes, last contacted timestamp).
-- ============================================================================

-- Add CRM fields to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'interested', 'proposal', 'closed', 'not_interested'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- Index for filtering by lead status
CREATE INDEX IF NOT EXISTS idx_businesses_lead_status ON public.businesses (lead_status);

-- RLS policy: allow users to update businesses from their own scans
CREATE POLICY "Users can update businesses from their scans"
  ON public.businesses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = businesses.scan_id
        AND scans.user_id = auth.uid()
    )
  );

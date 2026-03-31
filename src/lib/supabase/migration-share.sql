-- ============================================================================
-- MapKo — Share Scan Feature Migration
-- ============================================================================
-- Adds share_token and is_public columns to scans table,
-- plus RLS policies for public access to shared scans.
-- ============================================================================

-- Add columns for sharing
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Allow public access to shared scans (no auth required)
CREATE POLICY "Anyone can view public scans" ON public.scans FOR SELECT USING (is_public = true);
CREATE POLICY "Anyone can view businesses of public scans" ON public.businesses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scans WHERE scans.id = businesses.scan_id AND scans.is_public = true)
);
CREATE POLICY "Anyone can view analyses of public scan businesses" ON public.analyses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    JOIN public.scans ON scans.id = businesses.scan_id
    WHERE businesses.id = analyses.business_id AND scans.is_public = true
  )
);

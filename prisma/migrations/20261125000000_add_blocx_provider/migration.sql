-- Adds Blocx (otterblocx.com) as a third 10DLC provider.
-- ALTER TYPE ... ADD VALUE is additive and non-destructive; IF NOT EXISTS keeps re-runs safe.
ALTER TYPE "Provider" ADD VALUE IF NOT EXISTS 'BLOCX';

-- ═══════════════════════════════════════════════════════════════════
-- Maestro — Logistics HQ Seed Data
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Drop and recreate shipments table (clean slate for seed data)
DROP TABLE IF EXISTS shipments;

CREATE TABLE shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Identity
  shipment_ref TEXT NOT NULL,
  direction TEXT NOT NULL,
  shipment_type TEXT NOT NULL,

  -- Tracking
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,

  -- Status
  status TEXT DEFAULT 'label_created',
  status_detail TEXT,
  last_carrier_update TIMESTAMPTZ,

  -- Location
  current_location_city TEXT,
  current_location_state TEXT,
  current_location_country TEXT,

  -- Origin
  origin_name TEXT,
  origin_city TEXT,
  origin_state TEXT,
  origin_country TEXT DEFAULT 'US',

  -- Destination
  destination_name TEXT,
  destination_city TEXT,
  destination_state TEXT,
  destination_country TEXT DEFAULT 'US',

  -- Related entities (nullable)
  order_id UUID,
  customer_id UUID,
  mfg_order_id UUID,
  fabric_order_id UUID,
  supplier_id UUID,

  -- Dates
  ship_date TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  delivery_signature TEXT,

  -- Contents
  package_count INTEGER DEFAULT 1,
  weight_lbs DECIMAL(6,2),
  contents_summary TEXT,
  contents_value DECIMAL(10,2),

  -- Source tracking
  source TEXT DEFAULT 'manual',
  source_email_id TEXT,

  -- Alerts
  has_alert BOOLEAN DEFAULT false,
  alert_type TEXT,
  alert_message TEXT,
  alert_created_at TIMESTAMPTZ,

  -- Notes
  notes TEXT
);

-- Step 2: Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_direction ON shipments(direction);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier ON shipments(carrier);
CREATE INDEX IF NOT EXISTS idx_shipments_type ON shipments(shipment_type);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_estimated ON shipments(estimated_delivery);

-- Step 3: Create sequence for shipment refs
CREATE SEQUENCE IF NOT EXISTS shipment_seq START 41;

-- Step 4: Enable RLS but allow all access (adjust for production)
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated and anon users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shipments' AND policyname = 'Allow public read access on shipments'
  ) THEN
    CREATE POLICY "Allow public read access on shipments"
      ON shipments FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow insert for authenticated and anon users (for seeding)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shipments' AND policyname = 'Allow public insert access on shipments'
  ) THEN
    CREATE POLICY "Allow public insert access on shipments"
      ON shipments FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow update for authenticated and anon users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shipments' AND policyname = 'Allow public update access on shipments'
  ) THEN
    CREATE POLICY "Allow public update access on shipments"
      ON shipments FOR UPDATE
      USING (true);
  END IF;
END $$;

-- Step 5: Insert 15 realistic shipments
INSERT INTO shipments (
  shipment_ref, direction, shipment_type, status, carrier, tracking_number,
  origin_name, origin_city, origin_state, origin_country,
  destination_name, destination_city, destination_state, destination_country,
  ship_date, estimated_delivery, actual_delivery,
  package_count, weight_lbs, contents_summary, contents_value,
  has_alert, alert_type, alert_message, alert_created_at,
  source, current_location_city, current_location_state, current_location_country,
  status_detail, last_carrier_update
) VALUES

-- ═══════════════════════════════════════════
-- INBOUND: Factory Garments (4)
-- ═══════════════════════════════════════════

-- 1. YongZheng → L&S — in transit, 2 suits + trousers
(
  'SHP-2026-0041', 'inbound', 'garment_from_factory', 'in_transit',
  'FedEx', '748920184736201',
  'YongZheng Tailor Shop USA', 'Flushing', 'NY', 'US',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '3 days', now() + interval '1 day', NULL,
  2, 4.5, '2x Navy Suit (Harrison), 1x Gray Trousers (Torres)', 8500.00,
  false, NULL, NULL, NULL,
  'mfg_order_sync', 'Newark', 'NJ', 'US',
  'In transit - Package arrived at FedEx facility', now() - interval '6 hours'
),

-- 2. Repunte → L&S — in transit, bespoke jacket
(
  'SHP-2026-0042', 'inbound', 'garment_from_factory', 'in_transit',
  'UPS', '1Z999AA10123456784',
  'Repunte Custom', 'Brooklyn', 'NY', 'US',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '1 day', now() + interval '2 days', NULL,
  1, 2.8, '1x Bespoke Jacket (Chen)', 4200.00,
  false, NULL, NULL, NULL,
  'mfg_order_sync', 'Brooklyn', 'NY', 'US',
  'In transit - On FedEx vehicle for delivery', now() - interval '2 hours'
),

-- 3. Munro → L&S — out for delivery, dress shirts
(
  'SHP-2026-0043', 'inbound', 'garment_from_factory', 'out_for_delivery',
  'FedEx', '748920184739900',
  'Munro Tailoring', 'New York', 'NY', 'US',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '5 days', now(), NULL,
  1, 3.2, '3x Dress Shirts (Goldman Corp Account)', 2400.00,
  false, NULL, NULL, NULL,
  'mfg_order_sync', 'New York', 'NY', 'US',
  'Out for delivery', now() - interval '1 hour'
),

-- 4. YongZheng → L&S — delivered, suit + overcoat
(
  'SHP-2026-0039', 'inbound', 'garment_from_factory', 'delivered',
  'UPS', '1Z999AA10123456700',
  'YongZheng Tailor Shop USA', 'Flushing', 'NY', 'US',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '6 days', now() - interval '1 day', now() - interval '1 day',
  2, 5.1, '1x Charcoal Suit (Webb), 1x Overcoat (Ellison)', 9800.00,
  false, NULL, NULL, NULL,
  'mfg_order_sync', NULL, NULL, NULL,
  'Delivered - Signed by FRONT DESK', now() - interval '1 day'
),

-- ═══════════════════════════════════════════
-- INBOUND: Delayed Factory Shipment (1)
-- ═══════════════════════════════════════════

-- 5. Trung (Vietnam) → L&S — delayed, shirts stuck in Anchorage
(
  'SHP-2026-0036', 'inbound', 'garment_from_factory', 'in_transit',
  'FedEx', '748920184720000',
  'Trung Custom Shirts', 'Ho Chi Minh City', NULL, 'VN',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '14 days', now() - interval '3 days', NULL,
  1, 1.8, '5x Custom Shirts (Patel)', 1500.00,
  true, 'delayed', 'Package delayed 3 days — carrier reports weather disruption at Anchorage hub', now() - interval '3 days',
  'mfg_order_sync', 'Anchorage', 'AK', 'US',
  'Delay - Weather conditions', now() - interval '8 hours'
),

-- ═══════════════════════════════════════════
-- INBOUND: Fabric from Suppliers (2)
-- ═══════════════════════════════════════════

-- 6. Loro Piana (Italy) → L&S — customs hold at JFK
(
  'SHP-2026-0038', 'inbound', 'fabric_from_supplier', 'customs',
  'DHL', '1234567890DHL',
  'Loro Piana', 'Quarona', NULL, 'IT',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '8 days', now() - interval '1 day', NULL,
  1, 12.0, '15 yards Super 150s Navy Wool', 4200.00,
  true, 'customs_hold', 'Held at JFK customs — awaiting textile import documentation clearance', now() - interval '2 days',
  'gmail_parse', 'Jamaica', 'NY', 'US',
  'Customs status updated - Held for inspection', now() - interval '12 hours'
),

-- 7. Holland & Sherry → L&S — in transit, cotton + linen
(
  'SHP-2026-0047', 'inbound', 'fabric_from_supplier', 'in_transit',
  'USPS', '9400111899223100001234',
  'Holland & Sherry', 'New York', 'NY', 'US',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '2 days', now() + interval '1 day', NULL,
  1, 3.5, '8 yards Sea Island Cotton White, 4 yards Linen Blend', 1850.00,
  false, NULL, NULL, NULL,
  'gmail_parse', 'New York', 'NY', 'US',
  'In Transit to Next Facility', now() - interval '4 hours'
),

-- ═══════════════════════════════════════════
-- INBOUND: Supplies from Vendor (1)
-- ═══════════════════════════════════════════

-- 8. Saviero → L&S — picked up, thread + basting
(
  'SHP-2026-0048', 'inbound', 'supplies_from_vendor', 'picked_up',
  'UPS', '1Z999AA10123456888',
  'Saviero Textiles', 'New York', 'NY', 'US',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now(), now() + interval '2 days', NULL,
  1, 2.0, '20x Italian Silk Thread (Cream), 15x Basting Thread (White)', 320.00,
  false, NULL, NULL, NULL,
  'gmail_parse', NULL, NULL, NULL,
  'Picked up - UPS has package', now() - interval '30 minutes'
),

-- ═══════════════════════════════════════════
-- INBOUND: Sample Swatches (1)
-- ═══════════════════════════════════════════

-- 9. Dormeuil (Paris) → L&S — in transit, swatch book
(
  'SHP-2026-0049', 'inbound', 'sample_or_swatch', 'in_transit',
  'FedEx', '748920184755500',
  'Dormeuil', 'Paris', NULL, 'FR',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  now() - interval '4 days', now() + interval '2 days', NULL,
  1, 0.8, 'S/S 2027 Swatch Book — New Hopsack Collection', 0.00,
  false, NULL, NULL, NULL,
  'gmail_parse', 'Memphis', 'TN', 'US',
  'In transit - At FedEx Memphis hub', now() - interval '5 hours'
),

-- ═══════════════════════════════════════════
-- OUTBOUND: Client Deliveries (4)
-- ═══════════════════════════════════════════

-- 10. L&S → Harrison — out for delivery, hand delivery
(
  'SHP-2026-0044', 'outbound', 'client_delivery', 'out_for_delivery',
  'Hand Delivery', NULL,
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  'Richard Harrison', 'New York', 'NY', 'US',
  now(), now(), NULL,
  1, 4.0, '1x Navy 2-Piece Suit — Final delivery', 4500.00,
  false, NULL, NULL, NULL,
  'manual', NULL, NULL, NULL,
  'Hand delivery in progress', now()
),

-- 11. L&S → Torres — picked up, Uber Connect
(
  'SHP-2026-0045', 'outbound', 'client_delivery', 'picked_up',
  'Uber Connect', 'UC-8847291',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  'Michael Torres', 'New York', 'NY', 'US',
  now(), now(), NULL,
  1, 2.5, '1x Gray Flannel Trousers — alteration complete', 1200.00,
  false, NULL, NULL, NULL,
  'manual', NULL, NULL, NULL,
  'Driver picked up package', now() - interval '15 minutes'
),

-- 12. L&S → Ratner (Greenwich, CT) — in transit via FedEx
(
  'SHP-2026-0040', 'outbound', 'client_delivery', 'in_transit',
  'FedEx', '748920184755501',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  'David Ratner', 'Greenwich', 'CT', 'US',
  now() - interval '1 day', now() + interval '1 day', NULL,
  1, 3.0, '2x Dress Shirts, 1x Pocket Squares', 1800.00,
  false, NULL, NULL, NULL,
  'manual', 'Stamford', 'CT', 'US',
  'In transit - On FedEx vehicle', now() - interval '3 hours'
),

-- 13. L&S → Chen — delivered, hand delivery (tuxedo)
(
  'SHP-2026-0037', 'outbound', 'client_delivery', 'delivered',
  'Hand Delivery', NULL,
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  'James Chen', 'New York', 'NY', 'US',
  now() - interval '5 days', now() - interval '5 days', now() - interval '5 days',
  1, 3.5, '1x Midnight Blue Tuxedo', 4995.00,
  false, NULL, NULL, NULL,
  'manual', NULL, NULL, NULL,
  'Delivered to client at fitting appointment', now() - interval '5 days'
),

-- ═══════════════════════════════════════════
-- OUTBOUND: Exception (1)
-- ═══════════════════════════════════════════

-- 14. L&S → Kim — exception, doorman refused
(
  'SHP-2026-0046', 'outbound', 'client_delivery', 'exception',
  'UPS', '1Z999AA10123456800',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  'Robert Kim', 'New York', 'NY', 'US',
  now() - interval '2 days', now() - interval '1 day', NULL,
  1, 2.0, '1x Sport Coat', 2800.00,
  true, 'address_issue', 'Delivery attempted — doorman refused package, recipient name not on building file. UPS will retry tomorrow.', now() - interval '1 day',
  'manual', 'New York', 'NY', 'US',
  'Exception - Access problem', now() - interval '18 hours'
),

-- ═══════════════════════════════════════════
-- BONUS: Additional realistic shipment (1)
-- ═══════════════════════════════════════════

-- 15. L&S → Ellison — label created, not yet shipped
(
  'SHP-2026-0050', 'outbound', 'client_delivery', 'label_created',
  'FedEx', '748920184760001',
  'L&S Custom Tailors', 'New York', 'NY', 'US',
  'Thomas Ellison', 'Boston', 'MA', 'US',
  NULL, now() + interval '3 days', NULL,
  1, 5.5, '1x Cashmere Overcoat, 1x Suit Garment Bag', 6200.00,
  false, NULL, NULL, NULL,
  'manual', NULL, NULL, NULL,
  'Shipment information sent to FedEx', now()
);

-- Step 7: Auto-generate tracking URLs
UPDATE shipments
SET tracking_url = CASE
  WHEN carrier = 'FedEx' AND tracking_number IS NOT NULL
    THEN 'https://www.fedex.com/fedextrack/?trknbr=' || tracking_number
  WHEN carrier = 'UPS' AND tracking_number IS NOT NULL
    THEN 'https://www.ups.com/track?tracknum=' || tracking_number
  WHEN carrier = 'USPS' AND tracking_number IS NOT NULL
    THEN 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' || tracking_number
  WHEN carrier = 'DHL' AND tracking_number IS NOT NULL
    THEN 'https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=' || tracking_number
  ELSE NULL
END
WHERE shipment_ref IN (
  'SHP-2026-0041', 'SHP-2026-0042', 'SHP-2026-0043', 'SHP-2026-0039',
  'SHP-2026-0036', 'SHP-2026-0038', 'SHP-2026-0047', 'SHP-2026-0048',
  'SHP-2026-0049', 'SHP-2026-0044', 'SHP-2026-0045', 'SHP-2026-0040',
  'SHP-2026-0037', 'SHP-2026-0046', 'SHP-2026-0050'
);

-- ═══════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════
SELECT
  'Total seeded' AS metric,
  COUNT(*) AS value
FROM shipments
WHERE shipment_ref LIKE 'SHP-2026-%'

UNION ALL

SELECT
  'Active (not delivered/cancelled)',
  COUNT(*)
FROM shipments
WHERE status NOT IN ('delivered', 'cancelled', 'returned')
  AND shipment_ref LIKE 'SHP-2026-%'

UNION ALL

SELECT
  'With alerts',
  COUNT(*)
FROM shipments
WHERE has_alert = true
  AND shipment_ref LIKE 'SHP-2026-%'

UNION ALL

SELECT
  'Inbound',
  COUNT(*)
FROM shipments
WHERE direction = 'inbound'
  AND shipment_ref LIKE 'SHP-2026-%'

UNION ALL

SELECT
  'Outbound',
  COUNT(*)
FROM shipments
WHERE direction = 'outbound'
  AND shipment_ref LIKE 'SHP-2026-%';

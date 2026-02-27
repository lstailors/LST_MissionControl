#!/usr/bin/env node
/**
 * Maestro — Logistics HQ Seed Script
 *
 * Seeds the Supabase `shipments` table with 15 realistic test shipments.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=your-anon-key node scripts/seed-logistics.mjs
 *
 * Or create a .env file in the project root:
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_KEY=eyJhbGci...
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env if present ──
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* no .env file — that's fine */ }

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  console.error('');
  console.error('Set them as environment variables:');
  console.error('  SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=your-key node scripts/seed-logistics.mjs');
  console.error('');
  console.error('Or create a .env file in the project root.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ──
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
function daysFromNow(n) { return new Date(Date.now() + n * 86400000).toISOString(); }
function hoursAgo(n) { return new Date(Date.now() - n * 3600000).toISOString(); }
function minutesAgo(n) { return new Date(Date.now() - n * 60000).toISOString(); }
const now = new Date().toISOString();

function trackingUrl(carrier, tn) {
  if (!tn) return null;
  const urls = {
    'FedEx':  (t) => `https://www.fedex.com/fedextrack/?trknbr=${t}`,
    'UPS':    (t) => `https://www.ups.com/track?tracknum=${t}`,
    'USPS':   (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`,
    'DHL':    (t) => `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${t}`,
  };
  return urls[carrier]?.(tn) || null;
}

// ── Seed Data: 15 Shipments ──
const shipments = [
  // ═══ INBOUND: Factory Garments (4) ═══
  {
    shipment_ref: 'SHP-2026-0041',
    direction: 'inbound',
    shipment_type: 'garment_from_factory',
    status: 'in_transit',
    carrier: 'FedEx',
    tracking_number: '748920184736201',
    origin_name: 'YongZheng Tailor Shop USA',
    origin_city: 'Flushing', origin_state: 'NY', origin_country: 'US',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(3),
    estimated_delivery: daysFromNow(1),
    package_count: 2, weight_lbs: 4.5,
    contents_summary: '2x Navy Suit (Harrison), 1x Gray Trousers (Torres)',
    contents_value: 8500.00,
    has_alert: false,
    source: 'mfg_order_sync',
    current_location_city: 'Newark', current_location_state: 'NJ', current_location_country: 'US',
    status_detail: 'In transit - Package arrived at FedEx facility',
    last_carrier_update: hoursAgo(6),
  },
  {
    shipment_ref: 'SHP-2026-0042',
    direction: 'inbound',
    shipment_type: 'garment_from_factory',
    status: 'in_transit',
    carrier: 'UPS',
    tracking_number: '1Z999AA10123456784',
    origin_name: 'Repunte Custom',
    origin_city: 'Brooklyn', origin_state: 'NY', origin_country: 'US',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(1),
    estimated_delivery: daysFromNow(2),
    package_count: 1, weight_lbs: 2.8,
    contents_summary: '1x Bespoke Jacket (Chen)',
    contents_value: 4200.00,
    has_alert: false,
    source: 'mfg_order_sync',
    current_location_city: 'Brooklyn', current_location_state: 'NY', current_location_country: 'US',
    status_detail: 'In transit - On UPS vehicle for delivery',
    last_carrier_update: hoursAgo(2),
  },
  {
    shipment_ref: 'SHP-2026-0043',
    direction: 'inbound',
    shipment_type: 'garment_from_factory',
    status: 'out_for_delivery',
    carrier: 'FedEx',
    tracking_number: '748920184739900',
    origin_name: 'Munro Tailoring',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(5),
    estimated_delivery: now,
    package_count: 1, weight_lbs: 3.2,
    contents_summary: '3x Dress Shirts (Goldman Corp Account)',
    contents_value: 2400.00,
    has_alert: false,
    source: 'mfg_order_sync',
    current_location_city: 'New York', current_location_state: 'NY', current_location_country: 'US',
    status_detail: 'Out for delivery',
    last_carrier_update: hoursAgo(1),
  },
  {
    shipment_ref: 'SHP-2026-0039',
    direction: 'inbound',
    shipment_type: 'garment_from_factory',
    status: 'delivered',
    carrier: 'UPS',
    tracking_number: '1Z999AA10123456700',
    origin_name: 'YongZheng Tailor Shop USA',
    origin_city: 'Flushing', origin_state: 'NY', origin_country: 'US',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(6),
    estimated_delivery: daysAgo(1),
    actual_delivery: daysAgo(1),
    package_count: 2, weight_lbs: 5.1,
    contents_summary: '1x Charcoal Suit (Webb), 1x Overcoat (Ellison)',
    contents_value: 9800.00,
    has_alert: false,
    source: 'mfg_order_sync',
    status_detail: 'Delivered - Signed by FRONT DESK',
    last_carrier_update: daysAgo(1),
  },

  // ═══ INBOUND: Delayed Factory Shipment (1) ═══
  {
    shipment_ref: 'SHP-2026-0036',
    direction: 'inbound',
    shipment_type: 'garment_from_factory',
    status: 'in_transit',
    carrier: 'FedEx',
    tracking_number: '748920184720000',
    origin_name: 'Trung Custom Shirts',
    origin_city: 'Ho Chi Minh City', origin_state: null, origin_country: 'VN',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(14),
    estimated_delivery: daysAgo(3),
    package_count: 1, weight_lbs: 1.8,
    contents_summary: '5x Custom Shirts (Patel)',
    contents_value: 1500.00,
    has_alert: true,
    alert_type: 'delayed',
    alert_message: 'Package delayed 3 days — carrier reports weather disruption at Anchorage hub',
    alert_created_at: daysAgo(3),
    source: 'mfg_order_sync',
    current_location_city: 'Anchorage', current_location_state: 'AK', current_location_country: 'US',
    status_detail: 'Delay - Weather conditions',
    last_carrier_update: hoursAgo(8),
  },

  // ═══ INBOUND: Fabric from Suppliers (2) ═══
  {
    shipment_ref: 'SHP-2026-0038',
    direction: 'inbound',
    shipment_type: 'fabric_from_supplier',
    status: 'customs',
    carrier: 'DHL',
    tracking_number: '1234567890DHL',
    origin_name: 'Loro Piana',
    origin_city: 'Quarona', origin_state: null, origin_country: 'IT',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(8),
    estimated_delivery: daysAgo(1),
    package_count: 1, weight_lbs: 12.0,
    contents_summary: '15 yards Super 150s Navy Wool',
    contents_value: 4200.00,
    has_alert: true,
    alert_type: 'customs_hold',
    alert_message: 'Held at JFK customs — awaiting textile import documentation clearance',
    alert_created_at: daysAgo(2),
    source: 'gmail_parse',
    current_location_city: 'Jamaica', current_location_state: 'NY', current_location_country: 'US',
    status_detail: 'Customs status updated - Held for inspection',
    last_carrier_update: hoursAgo(12),
  },
  {
    shipment_ref: 'SHP-2026-0047',
    direction: 'inbound',
    shipment_type: 'fabric_from_supplier',
    status: 'in_transit',
    carrier: 'USPS',
    tracking_number: '9400111899223100001234',
    origin_name: 'Holland & Sherry',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(2),
    estimated_delivery: daysFromNow(1),
    package_count: 1, weight_lbs: 3.5,
    contents_summary: '8 yards Sea Island Cotton White, 4 yards Linen Blend',
    contents_value: 1850.00,
    has_alert: false,
    source: 'gmail_parse',
    current_location_city: 'New York', current_location_state: 'NY', current_location_country: 'US',
    status_detail: 'In Transit to Next Facility',
    last_carrier_update: hoursAgo(4),
  },

  // ═══ INBOUND: Supplies from Vendor (1) ═══
  {
    shipment_ref: 'SHP-2026-0048',
    direction: 'inbound',
    shipment_type: 'supplies_from_vendor',
    status: 'picked_up',
    carrier: 'UPS',
    tracking_number: '1Z999AA10123456888',
    origin_name: 'Saviero Textiles',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: now,
    estimated_delivery: daysFromNow(2),
    package_count: 1, weight_lbs: 2.0,
    contents_summary: '20x Italian Silk Thread (Cream), 15x Basting Thread (White)',
    contents_value: 320.00,
    has_alert: false,
    source: 'gmail_parse',
    status_detail: 'Picked up - UPS has package',
    last_carrier_update: minutesAgo(30),
  },

  // ═══ INBOUND: Sample Swatches (1) ═══
  {
    shipment_ref: 'SHP-2026-0049',
    direction: 'inbound',
    shipment_type: 'sample_or_swatch',
    status: 'in_transit',
    carrier: 'FedEx',
    tracking_number: '748920184755500',
    origin_name: 'Dormeuil',
    origin_city: 'Paris', origin_state: null, origin_country: 'FR',
    destination_name: 'L&S Custom Tailors',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(4),
    estimated_delivery: daysFromNow(2),
    package_count: 1, weight_lbs: 0.8,
    contents_summary: 'S/S 2027 Swatch Book — New Hopsack Collection',
    contents_value: 0.00,
    has_alert: false,
    source: 'gmail_parse',
    current_location_city: 'Memphis', current_location_state: 'TN', current_location_country: 'US',
    status_detail: 'In transit - At FedEx Memphis hub',
    last_carrier_update: hoursAgo(5),
  },

  // ═══ OUTBOUND: Client Deliveries (4) ═══
  {
    shipment_ref: 'SHP-2026-0044',
    direction: 'outbound',
    shipment_type: 'client_delivery',
    status: 'out_for_delivery',
    carrier: 'Hand Delivery',
    tracking_number: null,
    origin_name: 'L&S Custom Tailors',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'Richard Harrison',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: now,
    estimated_delivery: now,
    package_count: 1, weight_lbs: 4.0,
    contents_summary: '1x Navy 2-Piece Suit — Final delivery',
    contents_value: 4500.00,
    has_alert: false,
    source: 'manual',
    status_detail: 'Hand delivery in progress',
    last_carrier_update: now,
  },
  {
    shipment_ref: 'SHP-2026-0045',
    direction: 'outbound',
    shipment_type: 'client_delivery',
    status: 'picked_up',
    carrier: 'Uber Connect',
    tracking_number: 'UC-8847291',
    origin_name: 'L&S Custom Tailors',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'Michael Torres',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: now,
    estimated_delivery: now,
    package_count: 1, weight_lbs: 2.5,
    contents_summary: '1x Gray Flannel Trousers — alteration complete',
    contents_value: 1200.00,
    has_alert: false,
    source: 'manual',
    status_detail: 'Driver picked up package',
    last_carrier_update: minutesAgo(15),
  },
  {
    shipment_ref: 'SHP-2026-0040',
    direction: 'outbound',
    shipment_type: 'client_delivery',
    status: 'in_transit',
    carrier: 'FedEx',
    tracking_number: '748920184755501',
    origin_name: 'L&S Custom Tailors',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'David Ratner',
    destination_city: 'Greenwich', destination_state: 'CT', destination_country: 'US',
    ship_date: daysAgo(1),
    estimated_delivery: daysFromNow(1),
    package_count: 1, weight_lbs: 3.0,
    contents_summary: '2x Dress Shirts, 1x Pocket Squares',
    contents_value: 1800.00,
    has_alert: false,
    source: 'manual',
    current_location_city: 'Stamford', current_location_state: 'CT', current_location_country: 'US',
    status_detail: 'In transit - On FedEx vehicle',
    last_carrier_update: hoursAgo(3),
  },
  {
    shipment_ref: 'SHP-2026-0037',
    direction: 'outbound',
    shipment_type: 'client_delivery',
    status: 'delivered',
    carrier: 'Hand Delivery',
    tracking_number: null,
    origin_name: 'L&S Custom Tailors',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'James Chen',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(5),
    estimated_delivery: daysAgo(5),
    actual_delivery: daysAgo(5),
    package_count: 1, weight_lbs: 3.5,
    contents_summary: '1x Midnight Blue Tuxedo',
    contents_value: 4995.00,
    has_alert: false,
    source: 'manual',
    status_detail: 'Delivered to client at fitting appointment',
    last_carrier_update: daysAgo(5),
  },

  // ═══ OUTBOUND: Exception (1) ═══
  {
    shipment_ref: 'SHP-2026-0046',
    direction: 'outbound',
    shipment_type: 'client_delivery',
    status: 'exception',
    carrier: 'UPS',
    tracking_number: '1Z999AA10123456800',
    origin_name: 'L&S Custom Tailors',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'Robert Kim',
    destination_city: 'New York', destination_state: 'NY', destination_country: 'US',
    ship_date: daysAgo(2),
    estimated_delivery: daysAgo(1),
    package_count: 1, weight_lbs: 2.0,
    contents_summary: '1x Sport Coat',
    contents_value: 2800.00,
    has_alert: true,
    alert_type: 'address_issue',
    alert_message: 'Delivery attempted — doorman refused package, recipient name not on building file. UPS will retry tomorrow.',
    alert_created_at: daysAgo(1),
    source: 'manual',
    current_location_city: 'New York', current_location_state: 'NY', current_location_country: 'US',
    status_detail: 'Exception - Access problem',
    last_carrier_update: hoursAgo(18),
  },

  // ═══ BONUS: Label Created (1) ═══
  {
    shipment_ref: 'SHP-2026-0050',
    direction: 'outbound',
    shipment_type: 'client_delivery',
    status: 'label_created',
    carrier: 'FedEx',
    tracking_number: '748920184760001',
    origin_name: 'L&S Custom Tailors',
    origin_city: 'New York', origin_state: 'NY', origin_country: 'US',
    destination_name: 'Thomas Ellison',
    destination_city: 'Boston', destination_state: 'MA', destination_country: 'US',
    ship_date: null,
    estimated_delivery: daysFromNow(3),
    package_count: 1, weight_lbs: 5.5,
    contents_summary: '1x Cashmere Overcoat, 1x Suit Garment Bag',
    contents_value: 6200.00,
    has_alert: false,
    source: 'manual',
    status_detail: 'Shipment information sent to FedEx',
    last_carrier_update: now,
  },
];

// ── Add tracking URLs ──
for (const s of shipments) {
  s.tracking_url = trackingUrl(s.carrier, s.tracking_number);
}

// ── Main ──
async function seed() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Maestro — Logistics HQ Seed Script');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Shipments to seed: ${shipments.length}`);
  console.log('');

  // Step 1: Delete existing seed data (by shipment_ref)
  const seedRefs = shipments.map(s => s.shipment_ref);
  console.log('🗑️  Clearing existing seed data...');
  const { error: deleteError } = await supabase
    .from('shipments')
    .delete()
    .in('shipment_ref', seedRefs);

  if (deleteError) {
    console.error('⚠️  Delete warning (may be OK if table was empty):', deleteError.message);
  } else {
    console.log('   ✓ Cleared');
  }

  // Step 2: Insert shipments
  console.log('📦 Inserting shipments...');
  const { data, error: insertError } = await supabase
    .from('shipments')
    .insert(shipments)
    .select();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
    console.error('');
    console.error('Common fixes:');
    console.error('  1. Run the SQL in scripts/seed-logistics-data.sql first to create the table');
    console.error('  2. Check that RLS policies allow inserts (or use service_role key)');
    console.error('  3. Verify your SUPABASE_URL and SUPABASE_KEY are correct');
    process.exit(1);
  }

  console.log(`   ✓ Inserted ${data.length} shipments`);
  console.log('');

  // Step 3: Verification
  console.log('📊 Verification:');

  const { count: total } = await supabase
    .from('shipments')
    .select('*', { count: 'exact', head: true });

  const { count: active } = await supabase
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("delivered","cancelled","returned")');

  const { count: alerts } = await supabase
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .eq('has_alert', true);

  const { count: inbound } = await supabase
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'inbound');

  const { count: outbound } = await supabase
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'outbound');

  console.log(`   Total shipments:  ${total}`);
  console.log(`   Active:           ${active}`);
  console.log(`   With alerts:      ${alerts}`);
  console.log(`   Inbound:          ${inbound}`);
  console.log(`   Outbound:         ${outbound}`);
  console.log('');
  console.log('✅ Seed complete! Your Logistics HQ page should now show data.');
  console.log('');
}

seed().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

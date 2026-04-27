#!/usr/bin/env node

/**
 * Stress Test Script for eTicketing System
 * 
 * Usage: node stress-test-tickets.js <number_of_tickets> <seconds_interval>
 * 
 * Example: node stress-test-tickets.js 10 2
 * This will create 10 test tickets with 2 seconds interval between each creation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Parse command line arguments
const args = process.argv.slice(2);
const numberOfTickets = parseInt(args[0], 10);
const secondsInterval = parseInt(args[1], 10);

// Validation
if (!numberOfTickets || !secondsInterval || numberOfTickets <= 0 || secondsInterval <= 0) {
  console.error('❌ Invalid arguments!');
  console.error('Usage: node stress-test-tickets.js <number_of_tickets> <seconds_interval>');
  console.error('Example: node stress-test-tickets.js 10 2');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sample data for test tickets
const SAMPLE_CARRIERS = ['Carrier A', 'Carrier B', 'Carrier C'];
const SAMPLE_TRUCKS = ['01 2SM', '02 2SM', '03 2SM', '04 2SM'];
const SAMPLE_DRIVERS = ['Test Driver 1', 'Test Driver 2', 'Test Driver 3'];
const SAMPLE_ORIGIN_SITES = ['Primal Materials', 'Main Warehouse', 'Distribution Center'];
const SAMPLE_DESTINATION_SITES = ['Site A', 'Site B', 'Site C', 'Site D'];

/**
 * Generate a random test ticket
 */
function generateTestTicket(index) {
  const timestamp = Date.now();
  const ticketId = `TKT-Test-${timestamp}-${index}`;
  
  return {
    ticket_id: ticketId,
    truck_qr_id: `TRUCK-Test-${timestamp}-${index}`,
    truck_id: SAMPLE_TRUCKS[Math.floor(Math.random() * SAMPLE_TRUCKS.length)],
    product: 'Test Product',
    origin_site: SAMPLE_ORIGIN_SITES[Math.floor(Math.random() * SAMPLE_ORIGIN_SITES.length)],
    destination_site: SAMPLE_DESTINATION_SITES[Math.floor(Math.random() * SAMPLE_DESTINATION_SITES.length)],
    net_weight: Math.floor(Math.random() * 5000) + 1000,
    status: 'VERIFIED',
    created_at: new Date().toISOString(),
    verified_at_scale: new Date().toISOString(),
    carrier: SAMPLE_CARRIERS[Math.floor(Math.random() * SAMPLE_CARRIERS.length)],
    driver_name: SAMPLE_DRIVERS[Math.floor(Math.random() * SAMPLE_DRIVERS.length)],
  };
}

/**
 * Create a single test ticket
 */
async function createTestTicket(ticket) {
  try {
    const { error } = await supabase.from('tickets').insert(ticket);
    
    if (error) {
      console.error(`❌ Error creating ticket ${ticket.ticket_id}:`, error.message);
      return false;
    }
    
    console.log(`✅ Created ticket: ${ticket.ticket_id}`);
    return true;
  } catch (error) {
    console.error(`❌ Exception creating ticket ${ticket.ticket_id}:`, error.message);
    return false;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main stress test function
 */
async function runStressTest() {
  console.log('\n🚀 Starting Stress Test...');
  console.log(`📊 Creating ${numberOfTickets} test tickets with ${secondsInterval} second(s) interval\n`);
  
  let successCount = 0;
  let failureCount = 0;
  const startTime = Date.now();
  
  for (let i = 1; i <= numberOfTickets; i++) {
    const ticket = generateTestTicket(i);
    const success = await createTestTicket(ticket);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Wait before creating the next ticket (except for the last one)
    if (i < numberOfTickets) {
      console.log(`⏳ Waiting ${secondsInterval} second(s) before next ticket...\n`);
      await sleep(secondsInterval * 1000);
    }
  }
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('📈 Stress Test Results:');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`⏱️  Total Time: ${totalTime} seconds`);
  console.log(`📊 Average Time per Ticket: ${(totalTime / numberOfTickets).toFixed(2)} seconds`);
  console.log('='.repeat(50) + '\n');
  
  process.exit(failureCount > 0 ? 1 : 0);
}

// Run the stress test
runStressTest().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});


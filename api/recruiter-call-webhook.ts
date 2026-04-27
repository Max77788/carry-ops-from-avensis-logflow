import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Webhook endpoint to receive AI recruiter agent call summaries from VAPI
 * This endpoint processes end-of-call reports and updates driver candidate records
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize Supabase client with service role key for admin access
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // The payload structure from VAPI can be an array or object
    // Handle both cases
    let payload = req.body;
    
    // If it's an array, take the first element
    if (Array.isArray(payload) && payload.length > 0) {
      payload = payload[0];
    }
    
    // Extract the message data - VAPI sends it in body.message
    const message = payload?.body?.message || payload?.message;
    
    if (!message) {
      console.error('❌ Invalid payload structure - missing message');
      return res.status(400).json({
        success: false,
        error: 'Invalid payload structure - missing message'
      });
    }

    // Only process end-of-call-report messages
    if (message.type !== 'end-of-call-report') {
      console.log(`ℹ️ Ignoring message type: ${message.type}`);
      return res.status(200).json({
        success: true,
        message: 'Message type ignored'
      });
    }

    // Extract phone number from the call
    const phoneNumber = message.artifact?.variables?.customer?.number || 
                       message.artifact?.customer?.number;
    
    if (!phoneNumber) {
      console.error('❌ Missing phone number in payload');
      return res.status(400).json({
        success: false,
        error: 'Missing phone number in payload'
      });
    }

    // Extract call summary from structured outputs
    const structuredOutputs = message.artifact?.structuredOutputs || {};
    
    // Find the driver summary output
    let callSummary = '';
    let interestStatus: 'interested' | 'not_interested' | null = null;
    
    // Look for the "Driver AI Recruiter Agent Summary Prompt" output
    // The structured outputs have keys like "f27c9da6-c2a7-4e2b-bebe-cb1255a0173b"
    for (const [key, output] of Object.entries(structuredOutputs)) {
      if (output && typeof output === 'object') {
        // Check for summary by name
        if ('name' in output && output.name === 'Driver AI Recruiter Agent Summary Prompt' && 'result' in output) {
          callSummary = String(output.result || '');
        }
        // Also check if result is directly the summary (fallback)
        if (!callSummary && 'result' in output && typeof output.result === 'string' && output.result.length > 100) {
          callSummary = output.result;
        }
        
        // Check for interest status
        if ('name' in output && output.name === 'Is Driver Interested?' && 'result' in output) {
          interestStatus = output.result === true ? 'interested' : 'not_interested';
        }
      }
    }

    // Extract recording URL (prefer mono combined URL)
    const recordingUrl = message.artifact?.recording?.mono?.combinedUrl || 
                        message.artifact?.recordingUrl ||
                        message.artifact?.recording?.stereoUrl ||
                        null;

    // Extract call date
    const callDate = message.startedAt || message.endedAt || new Date().toISOString();

    console.log(`📞 Processing call summary for phone: ${phoneNumber}`);
    console.log(`   Interest Status: ${interestStatus}`);
    console.log(`   Summary Length: ${callSummary.length} chars`);
    console.log(`   Recording URL: ${recordingUrl ? 'Yes' : 'No'}`);

    // Normalize phone number from webhook to E.164 format
    const normalizeToE164 = (phone: string): string => {
      if (!phone) return '';
      const trimmed = phone.trim();
      
      // If already in E.164 format (starts with +), clean it
      if (trimmed.startsWith('+')) {
        const cleaned = '+' + trimmed.substring(1).replace(/\D/g, '');
        if (cleaned.length >= 3) return cleaned;
        return '';
      }
      
      // Remove all non-digit characters
      const digitsOnly = trimmed.replace(/\D/g, '');
      if (digitsOnly.length === 0) return '';
      
      // Handle US numbers (10 or 11 digits)
      if (digitsOnly.length === 10) {
        return '+1' + digitsOnly;
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        return '+' + digitsOnly;
      } else if (digitsOnly.length >= 10) {
        // Take last 10 digits and add +1 (US default)
        return '+1' + digitsOnly.substring(digitsOnly.length - 10);
      }
      
      return '';
    };

    const normalizedWebhookPhone = normalizeToE164(phoneNumber);
    
    if (!normalizedWebhookPhone) {
      console.error('❌ Invalid phone number format from webhook');
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    console.log(`🔍 Searching for phone: ${phoneNumber} (E.164: ${normalizedWebhookPhone})`);

    // Fetch all candidates and compare E.164 normalized phone numbers
    // Since we now store in E.164 format, we can do direct comparison
    const { data: allCandidates, error: searchError } = await supabase
      .from('driver_candidates')
      .select('id, phone, name');

    if (searchError) {
      console.error('❌ Error searching for candidate:', searchError);
      return res.status(500).json({
        success: false,
        error: 'Database search error'
      });
    }

    // Find matching candidate by comparing E.164 normalized phone numbers
    let matchedCandidate: { id: string; phone: string; name: string } | null = null;
    
    if (allCandidates && allCandidates.length > 0) {
      for (const c of allCandidates) {
        if (!c.phone) continue;
        
        // Normalize database phone number to E.164 (in case of old records)
        const normalizedDbPhone = normalizeToE164(c.phone);
        
        // Compare E.164 normalized phone numbers
        if (normalizedDbPhone === normalizedWebhookPhone) {
          matchedCandidate = c;
          console.log(`✅ Match found: ${c.name} - DB: ${c.phone} matches Webhook: ${phoneNumber}`);
          break;
        }
      }
    }
    
    if (!matchedCandidate) {
      console.log(`⚠️ No candidate found for phone: ${phoneNumber}`);
      // Optionally create a new candidate record
      // For now, we'll just log and return success
      return res.status(200).json({
        success: true,
        message: 'No candidate found for this phone number',
        phoneNumber
      });
    }

    const candidate = matchedCandidate;
    console.log(`✅ Found candidate: ${candidate.name} (${candidate.id})`);

    // Update candidate record with call information
    const updateData: any = {
      recruiter_call_date: callDate,
      updated_at: new Date().toISOString()
    };

    if (callSummary) {
      updateData.recruiter_call_summary = callSummary;
    }

    if (interestStatus) {
      updateData.recruiter_call_interest_status = interestStatus;
    }

    if (recordingUrl) {
      updateData.recruiter_call_recording_url = recordingUrl;
    }

    const { error: updateError } = await supabase
      .from('driver_candidates')
      .update(updateData)
      .eq('id', candidate.id);

    if (updateError) {
      console.error('❌ Error updating candidate:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update candidate record'
      });
    }

    console.log(`✅ Successfully updated candidate record`);

    return res.status(200).json({
      success: true,
      message: 'Call summary processed successfully',
      candidateId: candidate.id,
      phoneNumber
    });

  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}



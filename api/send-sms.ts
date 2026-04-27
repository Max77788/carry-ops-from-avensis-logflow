import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Normalize phone number to E.164 format for Twilio
 */
function normalizePhoneToE164(phone: string): string {
  if (!phone) return '';
  
  const trimmed = phone.trim();
  
  // If it already starts with +, clean it
  if (trimmed.startsWith('+')) {
    const cleaned = '+' + trimmed.substring(1).replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return cleaned;
    }
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
    // Default to US format for now
    return '+1' + digitsOnly.substring(digitsOnly.length - 10);
  }
  
  return '';
}

/**
 * Vercel Serverless Function to send SMS via Twilio API
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get SMS parameters from request body
  const { to, message } = req.body;

  // Validate required fields
  if (!to || !message) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: to, message' 
    });
  }

  // Normalize phone number to E.164 format
  const normalizedTo = normalizePhoneToE164(to);
  if (!normalizedTo) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format'
    });
  }

  // Check if Twilio is configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio not configured');
    return res.status(500).json({ 
      success: false,
      error: 'SMS service not configured' 
    });
  }

  try {
    console.log(`📱 Sending SMS to: ${normalizedTo}`);
    console.log(`📝 Message: ${message.substring(0, 50)}...`);

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', normalizedTo);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Twilio API error:', data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || `Failed to send SMS: ${response.status}`
      });
    }

    console.log(`✅ SMS sent successfully! Message SID: ${data.sid}`);

    return res.status(200).json({
      success: true,
      messageSid: data.sid,
    });
  } catch (error: any) {
    console.error('❌ Error sending SMS:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to send SMS'
    });
  }
}

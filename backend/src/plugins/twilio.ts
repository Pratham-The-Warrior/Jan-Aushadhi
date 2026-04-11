// ============================================================
// Module 7: Notification Bridge (Twilio WhatsApp)
// Connects the digital app to the physical store
// ============================================================

import * as dotenv from 'dotenv';
dotenv.config();

// Dynamic import for Twilio (it has heavy init overhead)
let twilioClient: any = null;

const SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH = process.env.TWILIO_AUTH_TOKEN || '';
const FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

if (SID && !SID.includes('mock')) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(SID, AUTH);
    console.log('✅ Twilio WhatsApp Bridge Initialized');
  } catch {
    console.warn('⚠️  Twilio module not available');
  }
}

/**
 * Builds the exact WhatsApp payload specified in Module 7:
 * 
 * "New JanAushadhi Requirement!
 * User: [Name] ([Phone])
 * Items: [Drug Code 1], [Drug Code 2]
 * Note: User will bring paper prescription."
 */
export function buildRequirementMessage(
  userName: string,
  userPhone: string,
  drugCodes: string[],
  ticketId: string
): string {
  return [
    `New JanAushadhi Requirement!`,
    `Ticket: ${ticketId}`,
    `User: ${userName} (${userPhone})`,
    `Items: ${drugCodes.join(', ')}`,
    `Note: User will bring paper prescription.`,
  ].join('\n');
}

/**
 * Sends WhatsApp message to a store phone number.
 * Falls back to console logging if Twilio is not configured.
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; sid?: string }> {
  if (!twilioClient) {
    console.log('\n📱 [WhatsApp Mock Send]');
    console.log(`   To: ${to}`);
    console.log(`   Message:\n${message.split('\n').map(l => `   | ${l}`).join('\n')}`);
    console.log('');
    return { success: true, sid: 'mock-sid' };
  }

  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: FROM,
      to: `whatsapp:${to}`,
    });
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error('Twilio WhatsApp Error:', error.message);
    return { success: false };
  }
}

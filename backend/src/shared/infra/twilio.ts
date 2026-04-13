// ============================================================
// Twilio WhatsApp Bridge Adapter
// Connects the digital platform to physical PMBJK stores.
// Falls back to console logging when Twilio is not configured.
// ============================================================

import { config } from '../config';

let twilioClient: any = null;

// ---- SDK Initialization ----

/**
 * Initialize the Twilio client using ESM dynamic import.
 * Called during app startup from buildApp().
 */
export async function initTwilio(): Promise<void> {
  if (!config.twilioAccountSid || config.twilioAccountSid.includes('mock')) {
    return;
  }

  try {
    const { default: twilio } = await import('twilio');
    twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
    console.log('✅ Twilio WhatsApp Bridge Initialized');
  } catch {
    console.warn('⚠️  Twilio module not available');
  }
}

/**
 * Check if Twilio is configured and ready to send messages.
 */
export function isTwilioReady(): boolean {
  return twilioClient !== null;
}

/**
 * Build the standardized WhatsApp message for a requirement ticket.
 *
 * @param userName   Customer name
 * @param userPhone  Customer phone number
 * @param drugCodes  List of requested drug codes
 * @param ticketId   Unique requirement ticket ID
 */
export function buildRequirementMessage(
  userName: string,
  userPhone: string,
  drugCodes: string[],
  ticketId: string,
): string {
  return [
    'New JanAushadhi Requirement!',
    `Ticket: ${ticketId}`,
    `User: ${userName} (${userPhone})`,
    `Items: ${drugCodes.join(', ')}`,
    'Note: User will bring paper prescription.',
  ].join('\n');
}

/**
 * Send a WhatsApp message to a store phone number.
 * Falls back to console logging if Twilio is not configured.
 *
 * @param to       Recipient phone number (E.164 format)
 * @param message  Message body
 * @returns Success status and optional message SID
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<{ success: boolean; sid?: string }> {
  if (!twilioClient) {
    console.log('\n📱 [WhatsApp Mock Send]');
    console.log(`   To: ${to}`);
    console.log(`   Message:\n${message.split('\n').map((l) => `   | ${l}`).join('\n')}`);
    console.log('');
    return { success: true, sid: 'mock-sid' };
  }

  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: config.twilioWhatsappNumber,
      to: `whatsapp:${to}`,
    });
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error('Twilio WhatsApp Error:', error.message);
    return { success: false };
  }
}

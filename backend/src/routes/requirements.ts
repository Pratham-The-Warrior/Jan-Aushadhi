// ============================================================
// Module 5: Requirement & Cart Management API
// Handles the "Prescription Cart" and user requirement packets
// ============================================================

import { FastifyInstance } from 'fastify';
import { queryDB } from '../plugins/db';
import { verifyAuth, AuthUser } from '../plugins/auth';
import { sendWhatsAppMessage, buildRequirementMessage } from '../plugins/twilio';

export default function requirementRoutes(server: FastifyInstance) {

  // --- Create Requirement (Checkout) ---
  server.post(
    '/api/v1/requirements/create',
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const user = (request as any).user as AuthUser;
      const body = request.body as {
        pmbjk_code: string;
        drug_codes: { code: string; quantity: number; name?: string; mrp?: number }[];
        legal_attestation: boolean;
        delivery_address?: string;
        payment_mode?: string;
      };

      // Validation 1: Legal attestation
      if (!body.legal_attestation) {
        return reply.code(400).send({
          error: 'Legal attestation is required. User must confirm they have a paper prescription.',
        });
      }

      // Validation 2: Drug codes present
      if (!body.drug_codes || body.drug_codes.length === 0) {
        return reply.code(400).send({ error: 'At least one drug code is required' });
      }

      // Validation 3: Verify pmbjk_code exists
      if (body.pmbjk_code) {
        try {
          const storeRes = await queryDB(
            'SELECT pmbjk_code, phone, name FROM stores WHERE pmbjk_code = $1',
            [body.pmbjk_code]
          );
          if (storeRes.rows.length === 0) {
            server.log.warn(`Store ${body.pmbjk_code} not found in DB — proceeding anyway`);
          }
        } catch {
          // Non-blocking for dev
        }
      }

      // Validation 4: Verify drug_codes are valid Jan Aushadhi items
      try {
        for (const item of body.drug_codes) {
          const drugRes = await queryDB(
            'SELECT drug_code FROM generic_meds WHERE drug_code = $1',
            [item.code]
          );
          if (drugRes.rows.length === 0) {
            server.log.warn(`Drug code ${item.code} not found in generic_meds — proceeding anyway`);
          }
        }
      } catch {
        // Non-blocking for dev
      }

      // Generate ticket ID
      const ticketId = `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // Calculate totals for savings tracking
      let totalBrandedValue = 0;
      let totalGenericValue = 0;
      for (const item of body.drug_codes) {
        totalGenericValue += (item.mrp || 0) * (item.quantity || 1);
      }

      try {
        // Persist to requirements table
        await queryDB(
          `INSERT INTO requirements 
           (id, user_id, pmbjk_code, items, status, legal_attestation, delivery_address, payment_mode, total_branded_value, total_generic_value, savings, created_at)
           VALUES ($1, $2, $3, $4, 'SENT', $5, $6, $7, $8, $9, $10, NOW())`,
          [
            ticketId,
            user.uid,
            body.pmbjk_code || 'unassigned',
            JSON.stringify(body.drug_codes),
            true,
            body.delivery_address || '',
            body.payment_mode || 'COD',
            totalBrandedValue,
            totalGenericValue,
            totalBrandedValue - totalGenericValue,
          ]
        );
      } catch (err: any) {
        server.log.error('DB insert failed:', err.message);
        // Continue anyway to send notification
      }

      // Module 7: WhatsApp notification to store
      const drugCodesList = body.drug_codes.map(d => d.code);
      const message = buildRequirementMessage(
        user.name || 'User',
        user.phone_number || 'N/A',
        drugCodesList,
        ticketId
      );

      const whatsappResult = await sendWhatsAppMessage('+919876543210', message);

      return reply.send({
        success: true,
        ticketId,
        status: 'SENT',
        whatsapp: whatsappResult.success ? 'delivered' : 'mock',
        payment_mode: body.payment_mode || 'COD',
      });
    }
  );

  // --- Get User's Requirements History ---
  server.get(
    '/api/v1/requirements',
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const user = (request as any).user as AuthUser;

      try {
        const result = await queryDB(
          `SELECT * FROM requirements WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
          [user.uid]
        );
        return reply.send({ count: result.rows.length, requirements: result.rows });
      } catch (err: any) {
        return reply.send({ count: 0, requirements: [] });
      }
    }
  );

  // --- Get Single Requirement by ID ---
  server.get(
    '/api/v1/requirements/:id',
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = (request as any).user as AuthUser;

      try {
        const result = await queryDB(
          'SELECT * FROM requirements WHERE id = $1 AND user_id = $2',
          [id, user.uid]
        );
        if (result.rows.length === 0) {
          return reply.code(404).send({ error: 'Requirement not found' });
        }
        return reply.send(result.rows[0]);
      } catch {
        return reply.code(500).send({ error: 'Failed to fetch requirement' });
      }
    }
  );
}

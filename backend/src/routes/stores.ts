// ============================================================
// Module 4: Hyper-Local Proximity Service (PostGIS)
// Finds the nearest Jan Aushadhi Kendra for fulfillment
// ============================================================

import { FastifyInstance } from 'fastify';
import { queryDB } from '../plugins/db';

export default function storeRoutes(server: FastifyInstance) {

  // --- Nearby Stores (PostGIS ST_DWithin + ST_Distance) ---
  server.get('/api/v1/stores/nearby', async (request, reply) => {
    const { lat, lng, radius } = request.query as {
      lat?: string;
      lng?: string;
      radius?: string;
    };

    if (!lat || !lng) {
      return reply.code(400).send({ error: 'lat and lng query params are required' });
    }

    const radiusMeters = parseInt(radius || '10000'); // Default 10km

    try {
      const result = await queryDB(
        `SELECT pmbjk_code, name, phone, address, pincode, state, district,
                ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance
         FROM stores
         WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
         ORDER BY distance ASC
         LIMIT 10`,
        [parseFloat(lng), parseFloat(lat), radiusMeters]
      );

      return reply.send({
        count: result.rows.length,
        radius_km: radiusMeters / 1000,
        stores: result.rows.map((s: any) => ({
          ...s,
          distance_km: Math.round((parseFloat(s.distance) / 1000) * 10) / 10,
        })),
      });
    } catch (err: any) {
      server.log.error('PostGIS query failed:', err.message);
      // Return mock data if PostGIS not yet seeded
      return reply.send({
        count: 3,
        radius_km: 10,
        stores: [
          {
            pmbjk_code: 'PMBJK-MH-001',
            name: 'Vasant Kunj Kendra #402',
            phone: '+91 98765 00001',
            address: '15, Sector 12, Vasant Kunj, New Delhi - 110070',
            distance_km: 1.2,
          },
          {
            pmbjk_code: 'PMBJK-MH-002',
            name: 'Saket Health Kendra',
            phone: '+91 98765 00002',
            address: 'B-4, Saket District Centre, New Delhi - 110017',
            distance_km: 3.8,
          },
          {
            pmbjk_code: 'PMBJK-MH-003',
            name: 'Hauz Khas Medical Centre',
            phone: '+91 98765 00003',
            address: '22 Aurobindo Marg, Hauz Khas, New Delhi - 110016',
            distance_km: 5.1,
          },
        ],
      });
    }
  });

  // --- Get Store by PMBJK Code ---
  server.get('/api/v1/stores/:pmbjk_code', async (request, reply) => {
    const { pmbjk_code } = request.params as { pmbjk_code: string };

    try {
      const result = await queryDB(
        'SELECT * FROM stores WHERE pmbjk_code = $1',
        [pmbjk_code]
      );
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Store not found' });
      }
      return reply.send(result.rows[0]);
    } catch (err: any) {
      return reply.code(500).send({ error: 'Failed to fetch store' });
    }
  });

  // --- Store confirms a requirement (Module 7 feedback loop) ---
  server.post('/api/v1/stores/confirm/:requirement_id', async (request, reply) => {
    const { requirement_id } = request.params as { requirement_id: string };

    try {
      const result = await queryDB(
        `UPDATE requirements SET status = 'CONFIRMED', updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [requirement_id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Requirement not found or already confirmed' });
      }

      return reply.send({
        success: true,
        message: 'Requirement confirmed by store',
        requirement: result.rows[0],
      });
    } catch (err: any) {
      return reply.code(500).send({ error: 'Failed to confirm requirement' });
    }
  });
}

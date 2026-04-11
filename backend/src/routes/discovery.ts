// ============================================================
// Module 3: Medicine Discovery & Comparison API
// The "Switching Engine" that calculates savings
// ============================================================

import { FastifyInstance } from 'fastify';
import { MeiliSearch } from 'meilisearch';
import { queryDB } from '../plugins/db';
import { getCached, setCache } from '../plugins/redis';

export default function discoveryRoutes(server: FastifyInstance, meiliClient: MeiliSearch) {

  // --- Search (Meilisearch + Redis + Postgres) ---
  server.get('/api/v1/search', async (request, reply) => {
    const { query } = request.query as { query?: string };
    if (!query || query.trim().length === 0) {
      return reply.code(400).send({ error: 'Missing query parameter' });
    }

    try {
      const index = meiliClient.index('medicines');
      const searchResponse = await index.search(query, { limit: 10 });
      const hits = searchResponse.hits;
      if (!hits || hits.length === 0) return reply.send([]);

      const results = await Promise.all(
        hits.map(async (branded: any) => {
          const saltHash = branded.salt_hash;
          let generic = null;

          if (saltHash) {
            // Try Redis cache first
            const cached = await getCached(`generic:${saltHash}`);
            if (cached) {
              generic = JSON.parse(cached);
            } else {
              // Cache miss — hit Postgres
              const pgRes = await queryDB(
                'SELECT * FROM generic_meds WHERE salt_hash = $1 LIMIT 1',
                [saltHash]
              );
              if (pgRes.rows.length > 0) {
                generic = pgRes.rows[0];
                await setCache(`generic:${saltHash}`, JSON.stringify(generic), 3600);
              }
            }
          }

          // Savings calculation (Module 3 spec)
          let savingsAbsolute = 0;
          let savingsPercentage = 0;
          if (generic && branded.mrp && generic.mrp) {
            savingsAbsolute = parseFloat(branded.mrp) - parseFloat(generic.mrp);
            savingsPercentage = (savingsAbsolute / parseFloat(branded.mrp)) * 100;
          }

          return {
            id: branded.id,
            branded: {
              name: branded.name,
              manufacturer: branded.manufacturer,
              mrp: parseFloat(branded.mrp) || 0,
              pack_size: branded.pack_size,
              composition1: branded.composition1,
              composition2: branded.composition2,
              salt_hash: branded.salt_hash,
            },
            generic: generic
              ? {
                  drug_code: generic.drug_code,
                  name: generic.generic_name,
                  mrp: parseFloat(generic.mrp) || 0,
                  unit_size: generic.unit_size,
                  group_name: generic.group_name,
                }
              : null,
            savings: {
              absolute: Math.round(savingsAbsolute * 100) / 100,
              percentage: Math.round(savingsPercentage * 10) / 10,
            },
          };
        })
      );

      return reply.send(results);
    } catch (err: any) {
      server.log.error('Discovery search error:', err.message);
      return reply.code(500).send({ error: 'Search service unavailable' });
    }
  });

  // --- Discovery by Branded ID (Module 3 exact spec) ---
  server.get('/api/v1/discovery/:branded_id', async (request, reply) => {
    const { branded_id } = request.params as { branded_id: string };

    try {
      // 1. Fetch the branded drug by ID
      const brandedRes = await queryDB(
        'SELECT * FROM branded_meds WHERE id = $1',
        [parseInt(branded_id)]
      );
      if (brandedRes.rows.length === 0) {
        return reply.code(404).send({ error: 'Branded medicine not found' });
      }
      const branded = brandedRes.rows[0];

      // 2. Extract its salt_hash
      const saltHash = branded.salt_hash;

      // 3. The Match: SELECT * FROM generic_meds WHERE salt_hash = ?
      let generic = null;
      if (saltHash) {
        const cached = await getCached(`generic:${saltHash}`);
        if (cached) {
          generic = JSON.parse(cached);
        } else {
          const genericRes = await queryDB(
            'SELECT * FROM generic_meds WHERE salt_hash = $1 LIMIT 1',
            [saltHash]
          );
          if (genericRes.rows.length > 0) {
            generic = genericRes.rows[0];
            await setCache(`generic:${saltHash}`, JSON.stringify(generic), 3600);
          }
        }
      }

      // 4. Savings Math
      let savingsAbsolute = 0;
      let savingsPercentage = 0;
      if (generic) {
        savingsAbsolute = parseFloat(branded.mrp) - parseFloat(generic.mrp);
        savingsPercentage = (savingsAbsolute / parseFloat(branded.mrp)) * 100;
      }

      // 5. Response: Combined Switch Object
      return reply.send({
        branded: {
          id: branded.id,
          name: branded.name,
          mrp: parseFloat(branded.mrp),
          manufacturer: branded.manufacturer,
          pack_size: branded.pack_size_label,
          composition1: branded.composition1,
          composition2: branded.composition2,
        },
        generic: generic
          ? {
              drug_code: generic.drug_code,
              name: generic.generic_name,
              mrp: parseFloat(generic.mrp),
              unit_size: generic.unit_size,
              group_name: generic.group_name,
            }
          : null,
        savings: {
          absolute: Math.round(savingsAbsolute * 100) / 100,
          percentage: Math.round(savingsPercentage * 10) / 10,
        },
      });
    } catch (err: any) {
      server.log.error('Discovery by ID error:', err.message);
      return reply.code(500).send({ error: 'Failed to fetch discovery data' });
    }
  });
}

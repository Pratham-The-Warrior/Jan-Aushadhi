// ============================================================
// Firebase Auth Plugin
// Middleware to decode Bearer tokens from frontend
// Syncs users to local PostgreSQL on first login
// ============================================================

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { FastifyRequest, FastifyReply } from 'fastify';
import { queryDB } from './db';

dotenv.config();

let firebaseInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin Initialized');
  } else {
    console.warn('⚠️  Firebase not configured — using mock auth for development');
  }
} catch (err) {
  console.warn('⚠️  Firebase init error — using mock auth');
}

export interface AuthUser {
  uid: string;
  phone_number?: string;
  email?: string;
  name?: string;
}

/**
 * Firebase Auth middleware for Fastify.
 * Verifies Bearer token and attaches user to request.
 * Hard requirement for Firebase Admin in production and development.
 */
export const verifyAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];

  if (!firebaseInitialized) {
    request.log.error('Firebase Admin not initialized. Cannot verify tokens.');
    return reply.status(500).send({ error: 'Internal Server Error: Authentication Service Unavailable' });
  }


  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user: AuthUser = {
      uid: decodedToken.uid,
      phone_number: decodedToken.phone_number,
      email: decodedToken.email,
      name: decodedToken.name,
    };
    (request as any).user = user;

    // Sync user to local PostgreSQL on first login (Module 6 dependency)
    try {
      await queryDB(
        `INSERT INTO users (firebase_uid, name, phone, email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (firebase_uid) DO NOTHING`,
        [user.uid, user.name || '', user.phone_number || '', user.email || '']
      );
    } catch {
      // Non-blocking — user table might not exist yet
    }
  } catch (error) {
    request.log.error('Firebase Auth verification failed:', error);
    return reply.status(403).send({ error: 'Unauthorized: Invalid token' });
  }
};

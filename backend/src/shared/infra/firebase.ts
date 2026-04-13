// ============================================================
// Firebase Admin Adapter
// Handles SDK initialization and provides the auth middleware.
// Separated from route-level concerns for clean DI.
// ============================================================

import * as admin from 'firebase-admin';
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { queryDB } from './database';
import { AuthenticationError, ExternalServiceError } from '../errors';
import type { AuthUser } from '../types';

let firebaseInitialized = false;

// ---- SDK Initialization ----

try {
  if (config.firebaseServiceAccount) {
    const serviceAccount = JSON.parse(config.firebaseServiceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin Initialized');
  } else {
    console.warn('⚠️  Firebase not configured — auth will reject all requests');
  }
} catch (err) {
  console.warn('⚠️  Firebase init error — auth will reject all requests');
}

/**
 * Check if Firebase Admin SDK is initialized.
 */
export function isFirebaseReady(): boolean {
  return firebaseInitialized;
}

/**
 * Fastify preHandler hook for Firebase token verification.
 *
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies via Firebase Admin SDK
 * 3. Attaches decoded AuthUser to request
 * 4. Syncs user to PostgreSQL on first login (non-blocking)
 *
 * @throws AuthenticationError on missing/invalid token
 * @throws ExternalServiceError if Firebase SDK is not initialized
 */
export async function verifyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid Authorization header');
  }

  const token = authHeader.split('Bearer ')[1];

  if (!firebaseInitialized) {
    request.log.error('Firebase Admin not initialized. Cannot verify tokens.');
    throw new ExternalServiceError('Firebase', 'Authentication service unavailable');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    const user: AuthUser = {
      uid: decodedToken.uid,
      phone_number: decodedToken.phone_number,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    request.user = user;

    // Sync user to local PostgreSQL on first login (non-blocking)
    syncUserToDatabase(user).catch(() => {
      // Non-blocking — user table might not exist yet
    });
  } catch (error) {
    request.log.error(error as any, 'Firebase Auth verification failed');
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Upsert user record in PostgreSQL.
 * Runs as fire-and-forget on each authenticated request.
 */
async function syncUserToDatabase(user: AuthUser): Promise<void> {
  await queryDB(
    `INSERT INTO users (firebase_uid, name, phone, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (firebase_uid) DO NOTHING`,
    [user.uid, user.name || '', user.phone_number || '', user.email || ''],
  );
}

// Re-export AuthUser for convenience
export type { AuthUser };

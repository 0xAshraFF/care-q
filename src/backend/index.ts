import { createDemoBackend } from './demo';
import type { Backend } from './types';

const env = import.meta.env;

/** VITE_FIREBASE_EMULATOR=1 runs the real Firebase code against local emulators (no project needed). */
const useEmulators = env.VITE_FIREBASE_EMULATOR === '1';

export const firebaseConfigured = useEmulators || Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);

let backendPromise: Promise<Backend> | null = null;

/** Firebase is loaded lazily so the first paint doesn't wait on the SDK. */
export function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = firebaseConfigured
      ? import('./firebase').then(({ createFirebaseBackend }) =>
          createFirebaseBackend(
            useEmulators
              ? // "demo-" project IDs never touch real Firebase; the emulators accept any key.
                { apiKey: 'demo-key', authDomain: 'demo-careq.firebaseapp.com', projectId: 'demo-careq', appId: 'demo' }
              : {
                  apiKey: env.VITE_FIREBASE_API_KEY,
                  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
                  projectId: env.VITE_FIREBASE_PROJECT_ID,
                  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
                  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                  appId: env.VITE_FIREBASE_APP_ID,
                },
            { emulators: useEmulators },
          ),
        )
      : Promise.resolve(createDemoBackend());
  }
  return backendPromise;
}

export type { Backend } from './types';

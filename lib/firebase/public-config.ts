function publicConfig() {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function missingFirebasePublicKeys() {
  return Object.entries(publicConfig())
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function getFirebasePublicConfig() {
  const config = publicConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Konfigurasi Firebase web belum lengkap: ${missing.join(", ")}`,
    );
  }

  return {
    apiKey: config.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: config.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: config.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };
}

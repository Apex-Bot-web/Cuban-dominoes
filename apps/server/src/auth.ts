import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);
const APPLE_JWKS = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys'),
);

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<{ sub: string; name?: string } | null> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['accounts.google.com', 'https://accounts.google.com'],
      audience: clientId,
    });
    const result: { sub: string; name?: string } = { sub: payload['sub'] as string };
    const name = payload['name'];
    if (typeof name === 'string') result.name = name;
    return result;
  } catch {
    return null;
  }
}

export async function verifyAppleIdToken(
  idToken: string,
  clientId: string,
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: clientId,
    });
    return { sub: payload['sub'] as string };
  } catch {
    return null;
  }
}

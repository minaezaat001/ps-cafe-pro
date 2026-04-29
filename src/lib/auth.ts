import { SignJWT, jwtVerify } from 'jose';

const accessTokenSecretKey = process.env.JWT_ACCESS_SECRET || 'ps-cafe-pro-access-secret-key';
const refreshTokenSecretKey = process.env.JWT_REFRESH_SECRET || 'ps-cafe-pro-refresh-secret-key';
const encodedAccessKey = new TextEncoder().encode(accessTokenSecretKey);
const encodedRefreshKey = new TextEncoder().encode(refreshTokenSecretKey);

export async function signAccessToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Short-lived access token
    .sign(encodedAccessKey);
}

export async function signRefreshToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Longer-lived refresh token
    .sign(encodedRefreshKey);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedAccessKey);
    return payload;
  } catch (err) {
    console.error('Access Token Verification failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedRefreshKey);
    return payload;
  } catch (err) {
    console.error('Refresh Token Verification failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

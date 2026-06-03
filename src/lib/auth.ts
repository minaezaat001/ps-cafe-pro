import { SignJWT, jwtVerify } from 'jose';

const accessTokenSecretKey = process.env.JWT_ACCESS_SECRET;
const refreshTokenSecretKey = process.env.JWT_REFRESH_SECRET;

if (!accessTokenSecretKey) {
  throw new Error('JWT_ACCESS_SECRET environment variable is required');
}
if (!refreshTokenSecretKey) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

const encodedAccessKey = new TextEncoder().encode(accessTokenSecretKey);
const encodedRefreshKey = new TextEncoder().encode(refreshTokenSecretKey);

export async function signAccessToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(encodedAccessKey);
}

export async function signRefreshToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
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

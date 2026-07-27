import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'school-mgmt-sys-secret-jwt-key-2026-secure'
)

export interface SessionPayload {
  userId: string
  username: string
  role: 'STAFF' | 'STUDENT'
  name: string
  staffId?: string
  studentId?: string
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, secret, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch (error) {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('school_session')?.value
    if (!token) return null
    return await decrypt(token)
  } catch (err) {
    return null
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies()
    cookieStore.set({
      name: 'school_session',
      value: '',
      expires: new Date(0),
      path: '/',
    })
  } catch (err) {
    console.error('Error during logout', err)
  }
}

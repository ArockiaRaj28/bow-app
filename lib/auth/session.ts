import { cookies, headers } from 'next/headers'
import crypto from 'crypto'
import { prisma } from './prisma'
import { SESSION_COOKIE } from './constants'

const SESSION_DAYS = 30

export type AuthUser = {
  id: string
  userId: string | null
  name: string
  email: string
  currency: string | null
  location: string | null
  schoolFee: number
  emailVerified: Date | null
  actualTimesEnabled: boolean
  role: 'USER' | 'ADMIN'
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export async function createSession(userId: string) {
  const token = createToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  // Mark Secure only when the request actually arrived over HTTPS,
  // read from the proxy-forwarded protocol header. Deriving this from
  // NODE_ENV alone breaks local Docker — a production build served on
  // plain http://localhost:3000 — where browsers that don't exempt
  // localhost (Firefox) reject the Secure cookie, the session never
  // persists, and every subsequent server action fails as
  // unauthenticated. Vercel and TLS-terminating proxies always send
  // x-forwarded-proto: https; direct HTTP (local/LAN) doesn't.
  const hdrs = await headers()
  const proto = hdrs.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const isHttps = proto === 'https'
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }

  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    select: {
      user: {
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          currency: true,
          location: true,
          schoolFee: true,
          emailVerified: true,
          actualTimesEnabled: true,
          role: true,
        },
      },
    },
  })

  return session?.user || null
}
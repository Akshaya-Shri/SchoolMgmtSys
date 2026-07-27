import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'school-mgmt-sys-secret-jwt-key-2026-secure'
)

interface SessionPayload {
  userId: string
  username: string
  role: 'STAFF' | 'STUDENT'
  name: string
  staffId?: string
  studentId?: string
}

async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, secret, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch (error) {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Exclude static assets, files in public folder, and Next.js internal paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('school_session')?.value
  const session = token ? await decrypt(token) : null

  // If visiting /login and already logged in, redirect to dashboard
  if (pathname === '/login') {
    if (session) {
      if (session.role === 'STAFF') {
        return NextResponse.redirect(new URL('/staff/dashboard', request.url))
      } else if (session.role === 'STUDENT') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url))
      }
    }
    return NextResponse.next()
  }

  // Protect staff routes
  if (pathname.startsWith('/staff')) {
    if (!session || session.role !== 'STAFF') {
      const loginUrl = new URL('/login', request.url)
      // Save original URL to redirect back after login
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect student routes
  if (pathname.startsWith('/student')) {
    if (!session || session.role !== 'STUDENT') {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect API routes
  if (pathname.startsWith('/api/staff')) {
    if (!session || session.role !== 'STAFF') {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Staff privilege required.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  if (pathname.startsWith('/api/student')) {
    if (!session || session.role !== 'STUDENT') {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Student privilege required.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  return NextResponse.next()
}

// Config to specify matching routes
export const config = {
  matcher: [
    '/login',
    '/staff/:path*',
    '/student/:path*',
    '/api/staff/:path*',
    '/api/student/:path*',
  ],
}

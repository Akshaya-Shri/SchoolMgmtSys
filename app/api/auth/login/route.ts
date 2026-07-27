import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        staff: true,
        student: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      )
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      )
    }

    // Prepare payload
    let name = ''
    let staffId: string | undefined = undefined
    let studentId: string | undefined = undefined

    if (user.role === 'STAFF') {
      if (!user.staff) {
        return NextResponse.json(
          { error: 'Staff profile not found.' },
          { status: 404 }
        )
      }
      name = user.staff.name
      staffId = user.staff.id
    } else if (user.role === 'STUDENT') {
      if (!user.student) {
        return NextResponse.json(
          { error: 'Student profile not found.' },
          { status: 404 }
        )
      }
      name = user.student.name
      studentId = user.student.id
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name,
      ...(staffId && { staffId }),
      ...(studentId && { studentId }),
    }

    // Create session token
    const token = await encrypt(payload)

    // Set cookie
    const response = NextResponse.json({ 
      success: true, 
      role: user.role,
      name 
    })

    response.cookies.set({
      name: 'school_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch (error) {
    console.error('Login API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during login.' },
      { status: 500 }
    )
  }
}

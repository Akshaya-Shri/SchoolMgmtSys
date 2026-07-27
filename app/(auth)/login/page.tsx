'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Lock, User, AlertCircle, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  username: z.string().min(1, 'Username / Student ID is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || ''
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Invalid credentials. Please try again.')
        setIsLoading(false)
        return
      }

      // Successful login
      router.refresh()
      
      // Redirect based on role and callbackUrl
      if (callbackUrl) {
        router.push(callbackUrl)
      } else {
        if (result.role === 'STAFF') {
          router.push('/staff/dashboard')
        } else {
          router.push('/student/dashboard')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('A network error occurred. Please try again later.')
      setIsLoading(false)
    }
  }

  // Helper function to fill test credentials
  const fillTestCredentials = (username: string) => {
    setValue('username', username)
    setValue('password', 'password123')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-100 via-indigo-50/20 to-violet-50/20">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-2xl shadow-lg shadow-indigo-100">
            S
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            School Digital Management System
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/50">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Error Notification */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-4 border border-rose-100 text-rose-800 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-semibold text-slate-700">
                Username / Student ID
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  {...register('username')}
                  className={`block w-full rounded-xl border py-3 pl-10 pr-3 text-sm placeholder-slate-400 outline-none transition-all duration-200 ${
                    errors.username 
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                  placeholder="e.g. priya or STU20260001"
                />
              </div>
              {errors.username && (
                <p className="text-xs font-medium text-rose-500">{errors.username.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className={`block w-full rounded-xl border py-3 pl-10 pr-3 text-sm placeholder-slate-400 outline-none transition-all duration-200 ${
                    errors.password 
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-rose-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center rounded-xl bg-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Test Account Section */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Test Accounts (Pre-Seeded)
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => fillTestCredentials('priya')}
                className="flex flex-col items-start rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-indigo-50/30 hover:border-indigo-100 text-left transition-all duration-200"
              >
                <span className="font-semibold text-slate-800">Teacher Account</span>
                <span className="text-[10px] text-slate-500 mt-0.5">User: priya</span>
                <span className="text-[10px] text-slate-500">Pass: password123</span>
              </button>

              <button
                type="button"
                onClick={() => fillTestCredentials('STU20260001')}
                className="flex flex-col items-start rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-indigo-50/30 hover:border-indigo-100 text-left transition-all duration-200"
              >
                <span className="font-semibold text-slate-800">Student Account</span>
                <span className="text-[10px] text-slate-500 mt-0.5">User: STU20260001</span>
                <span className="text-[10px] text-slate-500">Pass: password123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

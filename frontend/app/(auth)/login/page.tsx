'use client'

import { useState } from 'react'
import { useLogin } from '@/lib/queries/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { BackgroundIcon } from '@/components/branding/background-icon'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const loginMutation = useLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Login and redirect happen in mutation's onSuccess
    loginMutation.mutate({ email, password })
  }

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Theme Toggle - Top Right */}
      <div className="fixed right-4 top-4 md:right-6 md:top-6 z-50">
        <ThemeToggle />
      </div>

      {/* MOBILE: Icon in top-left corner */}
      <div className="md:hidden fixed left-4 top-4 z-40">
        <img 
          src="/assets/whiteicon.svg" 
          alt="Clubverse" 
          className="h-10 w-auto dark:invert-0 invert"
        />
      </div>

      {/* DESKTOP: Left panel with background icon */}
      <div className="hidden md:flex md:w-1/2 relative bg-background overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <BackgroundIcon className="w-full h-full max-w-4xl" />
        </div>
      </div>

      {/* Right panel with form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-background">
        <Card className="w-full max-w-md border border-border shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your Clubverse account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loginMutation.isPending}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginMutation.isPending}
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link 
              href="/register" 
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
        </Card>
        
        {/* MOBILE: Clubverse text below form */}
        <div className="md:hidden mt-8">
          <img 
            src="/assets/whiteclubverse.svg" 
            alt="Clubverse" 
            className="h-12 w-auto mx-auto dark:invert-0 invert"
          />
        </div>
      </div>
    </div>
  )
}


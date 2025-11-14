'use client'

import { useState } from 'react'
import { useRegister } from '@/lib/queries/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserRole } from '@/types'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { BackgroundIcon } from '@/components/branding/background-icon'
import { SelectField } from '@/components/common/form-field'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER)
  const [passwordError, setPasswordError] = useState('')
  const registerMutation = useRegister()
  const router = useRouter() // Keep router for the Sign in link onClick handler

  const validatePassword = (pwd: string): string => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters'
    }
    if (pwd.length > 128) {
      return 'Password must be less than 128 characters'
    }
    return ''
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    setPasswordError(validatePassword(newPassword))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const error = validatePassword(password)
    if (error) {
      setPasswordError(error)
      return
    }

    // Registration, login, and redirect all happen in mutation's onSuccess
    registerMutation.mutate({
      email,
      password,
      full_name: fullName || undefined,
      role,
    })
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
          src="/assets/previa/whiteprevia.svg" 
          alt="La Previa" 
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
        <Card className="w-full max-w-md border border-border shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Join La Previa</CardTitle>
          <CardDescription className="text-center">
            Create your account to start ordering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={registerMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                required
                disabled={registerMutation.isPending}
                error={!!passwordError}
                helperText={passwordError || 'Must be 8-128 characters'}
              />
            </div>
            <SelectField
              label="I am a..."
              name="role"
              options={[
                { value: UserRole.CUSTOMER, label: 'Customer' },
                { value: UserRole.CLUB_OWNER, label: 'Club Owner' },
                { value: UserRole.BARTENDER, label: 'Bartender' },
                { value: UserRole.ADMIN, label: 'Admin' },
              ]}
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              placeholder="Select your role"
              required
              disabled={registerMutation.isPending}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link 
              href="/login" 
              className="text-primary hover:underline font-medium transition-colors"
              onClick={(e) => {
                // Ensure navigation works
                e.preventDefault()
                router.push('/login')
              }}
            >
              Sign in
            </Link>
          </div>
        </CardContent>
        </Card>
        
        {/* MOBILE: La Previa text below form */}
        <div className="md:hidden mt-8">
          <img 
            src="/assets/previa/whiteprevia.svg" 
            alt="La Previa" 
            className="h-12 w-auto mx-auto dark:invert-0 invert"
          />
        </div>
      </div>
    </div>
  )
}


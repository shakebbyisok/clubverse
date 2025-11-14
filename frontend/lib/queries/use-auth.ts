import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { UserLogin, UserCreate, UserRole } from '@/types'
import { useAuth } from '../providers/auth-provider'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

// Get dashboard route based on user role
function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER:
      return '/clubs' // Customer views all clubs
    case UserRole.CLUB_OWNER:
      return '/club' // Club owner dashboard
    case UserRole.BARTENDER:
      return '/bartender' // Bartender dashboard
    case UserRole.ADMIN:
      return '/admin' // Admin dashboard
    default:
      return '/clubs'
  }
}

export function useLogin() {
  const { login } = useAuth()
  const router = useRouter()

  return useMutation({
    mutationFn: (credentials: UserLogin) => authApi.login(credentials.email, credentials.password),
    onSuccess: (data) => {
      login(data.access_token, data.user)
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.user.email}`,
      })
      // Redirect based on user role
      router.push(getDashboardRoute(data.user.role))
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.response?.data?.detail || 'Invalid email or password',
      })
    },
  })
}

export function useRegister() {
  const { login } = useAuth()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: UserCreate) => authApi.register(data),
    onSuccess: (response) => {
      login(response.access_token, response.user)
      toast({
        title: 'Account created!',
        description: 'Welcome to La Previa!',
      })
      // Redirect based on user role
      router.push(getDashboardRoute(response.user.role))
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail 
        || error.message 
        || 'Could not create account. Please check your connection and try again.'
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: errorMessage,
      })
    },
  })
}


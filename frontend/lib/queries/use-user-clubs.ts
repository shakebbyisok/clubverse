import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userClubsApi, UserClub } from '../api/user-clubs'
import { toast } from '@/hooks/use-toast'

// Query keys factory
export const userClubKeys = {
  all: ['user-clubs'] as const,
  lists: () => [...userClubKeys.all, 'list'] as const,
  detail: (id: string) => [...userClubKeys.all, 'detail', id] as const,
}

/**
 * Get all clubs the current user is registered with
 */
export function useUserClubs() {
  return useQuery({
    queryKey: userClubKeys.lists(),
    queryFn: () => userClubsApi.getUserClubs(),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Register user to a club
 */
export function useRegisterToClub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clubId: string) => userClubsApi.registerToClub(clubId),
    onSuccess: (newUserClub) => {
      queryClient.invalidateQueries({ queryKey: userClubKeys.lists() })
      queryClient.setQueryData(userClubKeys.detail(newUserClub.id), newUserClub)
      
      toast({
        title: 'Joined club!',
        description: `You've joined ${newUserClub.club.name}`,
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to join club',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}


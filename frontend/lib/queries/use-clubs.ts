import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clubsApi } from '../api/clubs'
import { Club, ClubCreate, ClubUpdate } from '@/types'
import { toast } from '@/hooks/use-toast'

// Query keys factory
export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters: string) => [...clubKeys.lists(), { filters }] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
  myClub: () => [...clubKeys.all, 'my'] as const,
}

/**
 * Get all clubs (public)
 */
export function useClubs(skip: number = 0, limit: number = 100) {
  return useQuery({
    queryKey: clubKeys.list(`${skip}-${limit}`),
    queryFn: () => clubsApi.getClubs(skip, limit),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Get club by ID
 */
export function useClub(clubId: string) {
  return useQuery({
    queryKey: clubKeys.detail(clubId),
    queryFn: () => clubsApi.getClub(clubId),
    enabled: !!clubId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get current user's club (club owner)
 */
export function useMyClub() {
  return useQuery({
    queryKey: clubKeys.myClub(),
    queryFn: () => clubsApi.getMyClub(),
    staleTime: 60000,
  })
}

/**
 * Create club
 */
export function useCreateClub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ClubCreate) => clubsApi.createClub(data),
    onSuccess: (newClub) => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() })
      queryClient.setQueryData(clubKeys.detail(newClub.id), newClub)
      queryClient.setQueryData(clubKeys.myClub(), newClub)
      
      toast({
        title: 'Club created!',
        description: `${newClub.name} has been created successfully.`,
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create club',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}

/**
 * Update club
 */
export function useUpdateClub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clubId, data }: { clubId: string; data: ClubUpdate }) =>
      clubsApi.updateClub(clubId, data),
    onSuccess: (updatedClub) => {
      queryClient.setQueryData(clubKeys.detail(updatedClub.id), updatedClub)
      queryClient.setQueryData(clubKeys.myClub(), updatedClub)
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() })
      
      toast({
        title: 'Club updated',
        description: 'Changes saved successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update club',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}


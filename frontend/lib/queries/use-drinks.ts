import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { drinksApi } from '../api/drinks'
import { Drink } from '@/types'
import { toast } from '@/hooks/use-toast'

export const drinkKeys = {
  all: ['drinks'] as const,
  byClub: (clubId: string) => [...drinkKeys.all, 'club', clubId] as const,
}

/**
 * Get drinks for a club
 */
export function useDrinks(clubId: string) {
  return useQuery({
    queryKey: drinkKeys.byClub(clubId),
    queryFn: () => drinksApi.getClubDrinks(clubId),
    enabled: !!clubId,
    staleTime: 30000,
  })
}

// NOTE: These hooks are commented out because the API doesn't have these endpoints yet
// The API only supports batch creation via drinksApi.batchCreate()

// /**
//  * Create drink
//  */
// export function useCreateDrink() {
//   const queryClient = useQueryClient()

//   return useMutation({
//     mutationFn: ({ clubId, data }: { clubId: string; data: DrinkCreate }) =>
//       drinksApi.createDrink(clubId, data),
//     onSuccess: (_, variables) => {
//       queryClient.invalidateQueries({ queryKey: drinkKeys.byClub(variables.clubId) })
      
//       toast({
//         title: 'Drink added!',
//         description: 'Drink has been added to your menu.',
//       })
//     },
//     onError: (error: any) => {
//       toast({
//         variant: 'destructive',
//         title: 'Failed to add drink',
//         description: error.response?.data?.detail || 'An error occurred',
//       })
//     },
//   })
// }

// /**
//  * Update drink
//  */
// export function useUpdateDrink() {
//   const queryClient = useQueryClient()

//   return useMutation({
//     mutationFn: ({ drinkId, data }: { drinkId: string; data: DrinkUpdate }) =>
//       drinksApi.updateDrink(drinkId, data),
//     onSuccess: (updatedDrink) => {
//       // Invalidate all drink queries (we don't know clubId here)
//       queryClient.invalidateQueries({ queryKey: drinkKeys.all })
      
//       toast({
//         title: 'Drink updated',
//         description: 'Changes saved successfully.',
//       })
//     },
//     onError: (error: any) => {
//       toast({
//         variant: 'destructive',
//         title: 'Failed to update drink',
//         description: error.response?.data?.detail || 'An error occurred',
//       })
//     },
//   })
// }

/**
 * Delete drink
 */
export function useDeleteDrink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (drinkId: string) => drinksApi.delete(drinkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drinkKeys.all })
      
      toast({
        title: 'Drink deleted',
        description: 'Drink has been removed from your menu.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete drink',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}


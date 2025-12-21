import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi, Category, CategoryCreate, SubcategoryCreate } from '../api/categories'
import { toast } from '@/hooks/use-toast'

// Query keys factory
export const categoryKeys = {
  all: ['categories'] as const,
  club: (clubId: string) => [...categoryKeys.all, 'club', clubId] as const,
}

/**
 * Get all categories for a club
 */
export function useCategories(clubId: string) {
  return useQuery({
    queryKey: categoryKeys.club(clubId),
    queryFn: () => categoriesApi.getClubCategories(clubId),
    enabled: !!clubId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Create category mutation
 */
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clubId, data }: { clubId: string; data: CategoryCreate }) =>
      categoriesApi.createCategory(clubId, data),
    onSuccess: (newCategory, variables) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.club(variables.clubId) })
      toast({
        title: 'Category created!',
        description: `${newCategory.name} has been created successfully.`,
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create category',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}

/**
 * Create subcategory mutation
 */
export function useCreateSubcategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: SubcategoryCreate }) =>
      categoriesApi.createSubcategory(categoryId, data),
    onSuccess: (newSubcategory, variables) => {
      // Invalidate all club category queries (we need clubId, but we can invalidate all)
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      toast({
        title: 'Subcategory created!',
        description: `${newSubcategory.name} has been created successfully.`,
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create subcategory',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}

/**
 * Update category mutation
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: CategoryCreate }) =>
      categoriesApi.updateCategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      toast({
        title: 'Category updated',
        description: 'Changes saved successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update category',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}

/**
 * Delete category mutation
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryId: string) => categoriesApi.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      toast({
        title: 'Category deleted',
        description: 'Category has been deleted successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete category',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}


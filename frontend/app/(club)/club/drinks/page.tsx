'use client'

import { Button } from '@/components/ui/button'
import { Plus, Wine, Building2, List, MoreVertical, Filter, Settings, Loader2 } from 'lucide-react'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { useState, useEffect, useMemo } from 'react'
import { drinksApi, Drink } from '@/lib/api/drinks'
import { drinkListsApi } from '@/lib/api/drink-lists'
import { clubsApi } from '@/lib/api/clubs'
import { categoriesApi, Category } from '@/lib/api/categories'
import { useToast } from '@/hooks/use-toast'
import { DrinkList } from '@/types'
import { CompactTable, CompactTableColumn } from '@/components/common/compact-table'
import { Pagination } from '@/components/common/pagination'
import { DrinkListFormModal } from '@/components/common/drink-list-form-modal'
import { DrinkListManageModal } from '@/components/common/drink-list-manage-modal'
import { AddDrinksModal } from '@/components/common/add-drinks-modal'
import { DrinkEditModal, DrinkUpdateData } from '@/components/common/drink-edit-modal'
import { CategoryManageModal } from '@/components/common/category-manage-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CategorySelect } from '@/components/common/category-select'
import { CategoryFilterSelect } from '@/components/common/category-filter-select'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { cn } from '@/lib/utils'
import { migrateImagePath } from '@/lib/utils/image-path'

type ViewMode = 'lists' | 'drinks'

export default function DrinksPage() {
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [drinkLists, setDrinkLists] = useState<DrinkList[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isAddDrinksModalOpen, setIsAddDrinksModalOpen] = useState(false)
  const [editingList, setEditingList] = useState<DrinkList | null>(null)
  const [managingList, setManagingList] = useState<DrinkList | null>(null)
  const [deletingList, setDeletingList] = useState<DrinkList | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('drinks')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDrinks, setSelectedDrinks] = useState<Set<string>>(new Set())
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null)
  const [deletingDrink, setDeletingDrink] = useState<Drink | null>(null)
  const [isDeletingDrink, setIsDeletingDrink] = useState(false)
  const [togglingDrinkId, setTogglingDrinkId] = useState<string | null>(null)
  const [updatingCategoryDrinkId, setUpdatingCategoryDrinkId] = useState<string | null>(null)
  
  // Categories for filtering
  const [systemCategories, setSystemCategories] = useState<Category[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  
  const itemsPerPage = 20
  const { toast } = useToast()

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const club = await clubsApi.getMyClub()
        if (club && club.id) {
          setClubId(club.id)
          
          const [clubDrinks, lists, categoryTree] = await Promise.all([
            drinksApi.getClubDrinks(club.id),
            drinkListsApi.getAll(),
            categoriesApi.getClubCategories(club.id),
          ])
          
          setDrinks(clubDrinks)
          setDrinkLists(lists)
          setSystemCategories(categoryTree.system_categories)
          setCustomCategories(categoryTree.custom_categories)
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to load data',
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [toast])

  const loadDrinkLists = async () => {
    try {
      const lists = await drinkListsApi.getAll()
      setDrinkLists(lists)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load drink lists',
      })
    }
  }

  const loadDrinks = async () => {
    if (!clubId) return
    try {
      const clubDrinks = await drinksApi.getClubDrinks(clubId)
      setDrinks(clubDrinks)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load drinks',
      })
    }
  }

  const loadCategories = async () => {
    if (!clubId) return
    try {
      const categoryTree = await categoriesApi.getClubCategories(clubId)
      setSystemCategories(categoryTree.system_categories)
      setCustomCategories(categoryTree.custom_categories)
    } catch (error: any) {
      // Silently fail - categories are not critical
    }
  }

  // Handle row selection
  const handleRowSelect = (rowId: string, selected: boolean) => {
    setSelectedDrinks(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(rowId)
      } else {
        newSet.delete(rowId)
      }
      return newSet
    })
  }

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedDrinks(new Set(paginatedDrinks.map(drink => drink.id)))
    } else {
      setSelectedDrinks(new Set())
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedDrinks.size === 0) return
    
    setIsDeletingBulk(true)
    try {
      // Delete each selected drink
      await Promise.all(
        Array.from(selectedDrinks).map(drinkId => drinksApi.delete(drinkId))
      )
      
      toast({
        title: 'Success!',
        description: `Deleted ${selectedDrinks.size} drink${selectedDrinks.size > 1 ? 's' : ''}`,
      })
      
      // Clear selection and reload
      setSelectedDrinks(new Set())
      await loadDrinks()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete drinks',
      })
    } finally {
      setIsDeletingBulk(false)
    }
  }

  // Handle single drink delete
  const handleDeleteDrink = async () => {
    if (!deletingDrink) return
    
    setIsDeletingDrink(true)
    try {
      await drinksApi.delete(deletingDrink.id)
      toast({
        title: 'Success!',
        description: 'Drink deleted successfully',
      })
      setDeletingDrink(null)
      await loadDrinks()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete drink',
      })
    } finally {
      setIsDeletingDrink(false)
    }
  }

  // Handle drink update
  const handleUpdateDrink = async (drinkId: string, data: DrinkUpdateData) => {
    // Convert price from number to string for API compatibility
    const apiData: Partial<Drink> = {
      ...data,
      price: data.price !== undefined ? String(data.price) : undefined,
    }
    await drinksApi.update(drinkId, apiData)
    await loadDrinks()
  }

  // Filter drinks by category
  const filteredDrinks = useMemo(() => {
    if (categoryFilter === 'all') return drinks
    if (categoryFilter === 'uncategorized') {
      return drinks.filter(d => !d.category_id && !d.category)
    }
    return drinks.filter(d => d.category_id === categoryFilter)
  }, [drinks, categoryFilter])

  // Paginate filtered drinks
  const paginatedDrinks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredDrinks.slice(start, start + itemsPerPage)
  }, [filteredDrinks, currentPage])
  
  // All categories for the filter
  const allCategories = useMemo(() => {
    return [...systemCategories, ...customCategories]
  }, [systemCategories, customCategories])


  // Handle inline category change with optimistic updates
  const handleCategoryChange = async (drink: Drink, categoryId: string | null) => {
    const category = allCategories.find(c => c.id === categoryId)
    const drinkId = drink.id
    
    setUpdatingCategoryDrinkId(drinkId)
    
    // Optimistic update - update UI immediately
    setDrinks(prevDrinks => 
      prevDrinks.map(d => 
        d.id === drinkId ? { 
          ...d, 
          category_id: categoryId,
          category_name: category?.name || null,
          category: category?.name || null, // Also update legacy field for consistency
        } : d
      )
    )
    
    try {
      await drinksApi.update(drinkId, {
        category: category?.name || null,
        category_id: categoryId,
      })
      
      // Reload to ensure we have the latest data from backend
      await Promise.all([
        loadDrinks(),
        loadCategories(), // Refresh categories in case new ones were added
      ])
    } catch (error: any) {
      // Revert on error
      setDrinks(prevDrinks => 
        prevDrinks.map(d => 
          d.id === drinkId ? { 
            ...d, 
            category_id: drink.category_id,
            category_name: drink.category_name,
            category: drink.category,
          } : d
        )
      )
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update category',
      })
    } finally {
      setUpdatingCategoryDrinkId(null)
    }
  }

  // Handle availability toggle with optimistic updates
  const handleToggleAvailability = async (drink: Drink) => {
    const newStatus = !drink.is_available
    const drinkId = drink.id
    
    // Optimistic update - update UI immediately
    setDrinks(prevDrinks => 
      prevDrinks.map(d => 
        d.id === drinkId ? { ...d, is_available: newStatus } : d
      )
    )
    
    setTogglingDrinkId(drinkId)
    
    try {
      await drinksApi.update(drinkId, {
        is_available: newStatus,
      })
      
      toast({
        title: 'Updated',
        description: `${drink.name} is now ${newStatus ? 'available' : 'unavailable'}`,
        duration: 2000,
      })
    } catch (error: any) {
      // Revert on error
      setDrinks(prevDrinks => 
        prevDrinks.map(d => 
          d.id === drinkId ? { ...d, is_available: !newStatus } : d
        )
      )
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update availability',
      })
    } finally {
      setTogglingDrinkId(null)
    }
  }

  // Table columns for drinks
  const drinkColumns: CompactTableColumn<Drink>[] = [
    {
      key: 'name',
      header: 'Drink',
      cell: (drink) => (
        <div className="flex items-center gap-2.5">
          {drink.image_url ? (
            <img
              src={migrateImagePath(drink.image_url) || drink.image_url}
              alt={drink.name}
              className="w-8 h-8 object-contain rounded-[var(--radius)] bg-background p-1"
              onError={(e) => {
                // Fallback to original if migrated path fails
                if (e.currentTarget.src !== drink.image_url) {
                  e.currentTarget.src = drink.image_url || ''
                }
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-[var(--radius)] bg-muted/50 flex items-center justify-center">
              <Wine className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm font-medium">{drink.name}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      width: '160px',
      cell: (drink) => {
        // Get category name from categories list if category_id is set, otherwise use drink.category_name
        const categoryFromList = drink.category_id 
          ? allCategories.find(c => c.id === drink.category_id)?.name
          : null
        const displayName = categoryFromList || drink.category_name || drink.category || null
        const isUpdating = updatingCategoryDrinkId === drink.id
        
        return (
          <CategorySelect
            value={drink.category_id || null}
            onValueChange={(value) => handleCategoryChange(drink, value)}
            systemCategories={systemCategories}
            customCategories={customCategories}
            placeholder="No category"
            className="w-[140px]"
            displayCategoryName={displayName}
            disabled={isUpdating}
            isLoading={isUpdating}
          />
        )
      },
    },
    {
      key: 'price',
      header: 'Price',
      cell: (drink) => (
        <span className="text-sm font-medium">
          ${parseFloat(drink.price).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (drink) => {
        const isToggling = togglingDrinkId === drink.id
        return (
          <button
            onClick={() => handleToggleAvailability(drink)}
            disabled={isToggling}
            className={cn(
              'text-xs px-2 py-1 rounded-full transition-all cursor-pointer relative',
              'hover:opacity-80 active:scale-95 disabled:opacity-50 disabled:cursor-wait',
              'ring-2 ring-transparent',
              drink.is_available 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/15' 
                : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/15',
              isToggling && 'ring-primary/50 animate-pulse'
            )}
            title={`Click to mark as ${drink.is_available ? 'unavailable' : 'available'}`}
          >
            {isToggling ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Updating...</span>
              </span>
            ) : (
              drink.is_available ? 'Available' : 'Unavailable'
            )}
          </button>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      width: '40px',
      cell: (drink) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingDrink(drink)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => setDeletingDrink(drink)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Table columns for lists
  const listColumns: CompactTableColumn<DrinkList>[] = [
    {
      key: 'name',
      header: 'List Name',
      cell: (list) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius)] bg-muted/50 flex items-center justify-center">
            <List className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{list.name}</span>
            {list.description && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {list.description}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'drink_count',
      header: 'Drinks',
      cell: (list) => (
        <span className="text-sm font-medium">{list.drink_count || 0}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '40px',
      cell: (list) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setEditingList(list)
              setIsListModalOpen(true)
            }}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeletingList(list)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const handleCreateList = () => {
    setEditingList(null)
    setIsListModalOpen(true)
  }

  const handleDeleteList = async () => {
    if (!deletingList) return
    try {
      await drinkListsApi.delete(deletingList.id)
      toast({
        title: 'Success!',
        description: 'Drink list deleted successfully',
      })
      loadDrinkLists()
      setDeletingList(null)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete drink list',
      })
    }
  }

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  if (!clubId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-1">No Club Selected</h3>
          <p className="text-sm text-muted-foreground">
            Please select a club from the sidebar
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'drinks', label: 'Drinks' },
    { id: 'lists', label: 'Lists' },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setViewMode(tab.id as ViewMode)
                  setCurrentPage(1)
                  setSelectedDrinks(new Set()) // Clear selection when switching tabs
                }}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium border-b-2 transition-colors',
                  viewMode === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Category filter and manage - only show on drinks tab */}
          {viewMode === 'drinks' && (
            <>
              <CategoryFilterSelect
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value)
                  setCurrentPage(1)
                }}
                systemCategories={systemCategories}
                customCategories={customCategories}
              />
              
              {/* Manage categories button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCategoryModalOpen(true)}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                title="Manage Categories"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          
          {/* Bulk delete button - only show when drinks are selected */}
          {viewMode === 'drinks' && selectedDrinks.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="gap-1.5 h-8"
            >
              {isDeletingBulk ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  Delete ({selectedDrinks.size})
                </>
              )}
            </Button>
          )}
        </div>
        
        <Button
          variant="default"
          onClick={viewMode === 'lists' ? handleCreateList : () => setIsAddDrinksModalOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {viewMode === 'lists' ? 'Create List' : 'Add Drinks'}
        </Button>
      </div>

      {/* Table */}
      {viewMode === 'drinks' ? (
        <>
          <CompactTable
            data={paginatedDrinks}
            columns={drinkColumns}
            keyExtractor={(drink) => drink.id}
            emptyMessage="No drinks found"
            selectable={true}
            selectedRows={selectedDrinks}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
          />
          {filteredDrinks.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredDrinks.length / itemsPerPage)}
              totalItems={filteredDrinks.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <>
          <CompactTable
            data={drinkLists}
            columns={listColumns}
            keyExtractor={(list) => list.id}
            emptyMessage="No drink lists found. Create your first list to get started."
            selectable={true}
            onRowClick={(list) => {
              setManagingList(list)
              setIsManageModalOpen(true)
            }}
          />
        </>
      )}

      {/* Modals */}
      <DrinkListFormModal
        open={isListModalOpen}
        onOpenChange={setIsListModalOpen}
        drinkList={editingList}
        onSuccess={loadDrinkLists}
      />

      <DrinkListManageModal
        open={isManageModalOpen}
        onOpenChange={setIsManageModalOpen}
        drinkList={managingList}
        onSuccess={loadDrinkLists}
      />

      <AddDrinksModal
        open={isAddDrinksModalOpen}
        onOpenChange={setIsAddDrinksModalOpen}
        onSuccess={async () => {
          // Refresh drinks list
          if (clubId) {
            const drinks = await drinksApi.getClubDrinks(clubId)
            setDrinks(drinks)
          }
        }}
      />

      <ConfirmDialog
        open={!!deletingList}
        onOpenChange={(open) => !open && setDeletingList(null)}
        title="Delete Drink List"
        description={
          <>
            Are you sure you want to delete <span className="font-medium text-foreground">{deletingList?.name}</span>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteList}
        variant="destructive"
      />

      {/* Drink Edit Modal */}
      {clubId && (
        <DrinkEditModal
          open={!!editingDrink}
          onOpenChange={(open) => !open && setEditingDrink(null)}
          drink={editingDrink}
          clubId={clubId}
          onSave={handleUpdateDrink}
        />
      )}

      {/* Delete Drink Confirmation */}
      <ConfirmDialog
        open={!!deletingDrink}
        onOpenChange={(open) => !open && setDeletingDrink(null)}
        title="Delete Drink"
        description={
          <>
            Are you sure you want to delete <span className="font-medium text-foreground">{deletingDrink?.name}</span>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteDrink}
        isLoading={isDeletingDrink}
        variant="destructive"
      />

      {/* Category Management Modal */}
      {clubId && (
        <CategoryManageModal
          open={isCategoryModalOpen}
          onOpenChange={setIsCategoryModalOpen}
          clubId={clubId}
          onCategoriesChanged={loadCategories}
        />
      )}
    </div>
  )
}

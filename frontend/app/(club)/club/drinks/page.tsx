'use client'

import { Button } from '@/components/ui/button'
import { Plus, Wine, Loader2, Building2, List, MoreVertical } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { drinksApi, Drink } from '@/lib/api/drinks'
import { drinkListsApi } from '@/lib/api/drink-lists'
import { clubsApi } from '@/lib/api/clubs'
import { useToast } from '@/hooks/use-toast'
import { DrinkList } from '@/types'
import { CompactTable, CompactTableColumn } from '@/components/common/compact-table'
import { Pagination } from '@/components/common/pagination'
import { DrinkListFormModal } from '@/components/common/drink-list-form-modal'
import { DrinkListManageModal } from '@/components/common/drink-list-manage-modal'
import { AddDrinksModal } from '@/components/common/add-drinks-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

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
  const itemsPerPage = 20
  const { toast } = useToast()

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const club = await clubsApi.getMyClub()
        if (club && club.id) {
          setClubId(club.id)
          
          const [clubDrinks, lists] = await Promise.all([
            drinksApi.getClubDrinks(club.id),
            drinkListsApi.getAll(),
          ])
          
          setDrinks(clubDrinks)
          setDrinkLists(lists)
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

  // Paginate drinks
  const paginatedDrinks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return drinks.slice(start, start + itemsPerPage)
  }, [drinks, currentPage])


  // Table columns for drinks
  const drinkColumns: CompactTableColumn<Drink>[] = [
    {
      key: 'name',
      header: 'Drink',
      cell: (drink) => (
        <div className="flex items-center gap-2.5">
          {drink.image_url ? (
            <img
              src={drink.image_url}
              alt={drink.name}
              className="w-8 h-8 object-contain rounded-[var(--radius)] bg-background p-1"
            />
          ) : (
            <div className="w-8 h-8 rounded-[var(--radius)] bg-muted/50 flex items-center justify-center">
              <Wine className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{drink.name}</span>
            {drink.category && (
              <span className="text-xs text-muted-foreground">{drink.category}</span>
            )}
          </div>
        </div>
      ),
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
      cell: (drink) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          drink.is_available 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {drink.is_available ? 'Available' : 'Unavailable'}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (drink) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
          {drink.description || '-'}
        </span>
      ),
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
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
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
      <div className="flex items-center justify-between">
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
          {drinks.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(drinks.length / itemsPerPage)}
              totalItems={drinks.length}
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

      <AlertDialog open={!!deletingList} onOpenChange={(open) => !open && setDeletingList(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drink List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingList?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteList}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

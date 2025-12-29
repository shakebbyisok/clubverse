'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Edit2 } from 'lucide-react'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Bartender } from '@/types'
import { bartendersApi } from '@/lib/api/bartenders'
import { clubsApi } from '@/lib/api/clubs'
import { BartenderFormModal } from '@/components/common/bartender-form-modal'
import { BartenderEditModal } from '@/components/common/bartender-edit-modal'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function BartendersPage() {
  const { toast } = useToast()
  const [bartenders, setBartenders] = useState<Bartender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBartender, setEditingBartender] = useState<Bartender | null>(null)

  // Fetch all bartenders for all clubs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get selected club from localStorage (for modal default)
        const savedClubId = localStorage.getItem('selectedClubId')
        
        let targetClubId: string | null = null
        
        if (savedClubId) {
          // Verify club exists and user owns it
          try {
            const club = await clubsApi.getClub(savedClubId)
            targetClubId = club.id
          } catch {
            // Club not found or not owned, fall back to getMyClub
            const club = await clubsApi.getMyClub()
            targetClubId = club?.id || null
          }
        } else {
          // No saved club, use getMyClub
          const club = await clubsApi.getMyClub()
          targetClubId = club?.id || null
        }
        
        setClubId(targetClubId)
        
        // Always fetch all bartenders for all clubs - NEVER use getByClub()
        console.log('[BartendersPage] Initial load, fetching ALL bartenders')
        const data = await bartendersApi.getAll()
        setBartenders(data)
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to load bartenders',
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
    
    // Listen for club changes from the selector (for modal default only)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedClubId' && e.newValue) {
        setClubId(e.newValue)
        // Refresh all bartenders - ALWAYS use getAll(), never getByClub()
        console.log('[BartendersPage] Club changed via storage, fetching ALL bartenders')
        bartendersApi.getAll().then(setBartenders).catch(() => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to refresh bartenders list',
          })
        })
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom event (for same-tab updates)
    const handleClubChange = (e: CustomEvent<string>) => {
      setClubId(e.detail)
      // Refresh all bartenders - ALWAYS use getAll(), never getByClub()
      console.log('[BartendersPage] Club changed via event, fetching ALL bartenders')
      bartendersApi.getAll().then(setBartenders).catch(() => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to refresh bartenders list',
        })
      })
    }
    
    window.addEventListener('clubChanged' as any, handleClubChange as EventListener)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('clubChanged' as any, handleClubChange as EventListener)
    }
  }, [toast])

  const handleSuccess = async () => {
    // Reload all bartenders
    try {
      const data = await bartendersApi.getAll()
      setBartenders(data)
      // Ensure clubId is set for modal default
      const currentClubId = clubId || localStorage.getItem('selectedClubId')
      if (currentClubId) {
        setClubId(currentClubId)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh bartenders list',
      })
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button 
          variant="dashed" 
          className="gap-1.5"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Bartender
        </Button>
      </div>

      {/* Bartenders List */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Staff Members</CardTitle>
          <CardDescription>All bartenders working at your club</CardDescription>
        </CardHeader>
        <CardContent>
          {bartenders.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">No bartenders yet</h3>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Get started by adding your first bartender
              </p>
              <Button 
                variant="dashed" 
                className="mt-3 gap-1.5"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Bartender
              </Button>
            </div>
          ) : (
            <div className="rounded-[var(--radius)] border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bartenders.map((bartender) => (
                    <TableRow key={bartender.id}>
                      <TableCell className="font-medium">
                        {bartender.user_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {bartender.user_email || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {bartender.club_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-xs pointer-events-none',
                            bartender.is_active
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {bartender.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(bartender.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit Club Association"
                          onClick={() => setEditingBartender(bartender)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bartender Modal */}
      {clubId && (
        <BartenderFormModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          clubId={clubId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Edit Bartender Modal */}
      {editingBartender && (
        <BartenderEditModal
          open={!!editingBartender}
          onOpenChange={(open) => !open && setEditingBartender(null)}
          bartender={editingBartender}
          currentClubId={clubId || editingBartender.club_id}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}


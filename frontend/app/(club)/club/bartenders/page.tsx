'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Loader2, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function BartendersPage() {
  const { toast } = useToast()
  const [bartenders, setBartenders] = useState<Bartender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch club ID and bartenders
  useEffect(() => {
    const fetchData = async () => {
      try {
        const club = await clubsApi.getMyClub()
        if (club?.id) {
          setClubId(club.id)
          const data = await bartendersApi.getByClub(club.id)
          setBartenders(data)
        }
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
  }, [toast])

  const handleSuccess = async () => {
    if (clubId) {
      try {
        const data = await bartendersApi.getByClub(clubId)
        setBartenders(data)
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to refresh bartenders list',
        })
      }
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
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-1">No Club Selected</h3>
          <p className="text-sm text-muted-foreground">
            Please select a club from the sidebar
          </p>
        </div>
      </div>
    )
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
                        {/* Email not in response, would need to fetch from user */}
                        -
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-xs',
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
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Remove Bartender"
                          disabled
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  )
}


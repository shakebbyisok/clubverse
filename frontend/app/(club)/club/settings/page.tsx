'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, List, CreditCard, CheckCircle2, AlertCircle, Building2, RefreshCw, Clock, XCircle } from 'lucide-react'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { useToast } from '@/hooks/use-toast'
import { clubsApi } from '@/lib/api/clubs'
import { stripeConnectApi } from '@/lib/api/stripe-connect'
import { Club } from '@/types'
import { DataTable, Column } from '@/components/common/data-table'
import { ClubFormModal } from '@/components/common/club-form-modal'
import { ClubDrinkListsModal } from '@/components/common/club-drink-lists-modal'
import { ClubLogo } from '@/components/common/club-logo'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { cn } from '@/lib/utils'

type SettingsViewMode = 'clubs' | 'payments'

export default function ClubSettingsPage() {
  const { toast } = useToast()
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDrinkListsModalOpen, setIsDrinkListsModalOpen] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [deletingClub, setDeletingClub] = useState<Club | null>(null)
  const [managingDrinkListsClub, setManagingDrinkListsClub] = useState<Club | null>(null)
  const [drinkListCounts, setDrinkListCounts] = useState<Record<string, number>>({})
  const [stripeStatus, setStripeStatus] = useState<any>(null)
  const [isLoadingStripe, setIsLoadingStripe] = useState(false)
  const [isRefreshingStripe, setIsRefreshingStripe] = useState(false)
  const [viewMode, setViewMode] = useState<SettingsViewMode>('clubs')

  const loadStripeStatus = useCallback(async () => {
    setIsLoadingStripe(true)
    try {
      const status = await stripeConnectApi.getStatus()
      setStripeStatus(status)
    } catch (error: any) {
      // Silently fail - user might not have Stripe set up
    } finally {
      setIsLoadingStripe(false)
    }
  }, [])

  const loadClubs = useCallback(async () => {
    try {
      const data = await clubsApi.getMyClubs()
      setClubs(data)
      
      // Fetch drink list counts for each club
      const counts: Record<string, number> = {}
      await Promise.all(
        data.map(async (club) => {
          try {
            const listIds = await clubsApi.getClubDrinkLists(club.id)
            counts[club.id] = listIds.length
          } catch (error) {
            counts[club.id] = 0
          }
        })
      )
      setDrinkListCounts(counts)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load clubs',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadClubs()
    loadStripeStatus()
    
    // Check if returning from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('stripe_return') === 'true' || urlParams.get('stripe_refresh') === 'true') {
      // Reload status multiple times after returning from Stripe (verification can take a moment)
      const refreshIntervals = [1000, 3000, 6000]
      refreshIntervals.forEach(delay => {
        setTimeout(() => {
          loadStripeStatus()
        }, delay)
      })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loadClubs, loadStripeStatus])

  const handleRefreshStripeStatus = async () => {
    setIsRefreshingStripe(true)
    try {
      const status = await stripeConnectApi.refreshStatus()
      setStripeStatus(status)
      toast({
        title: 'Status updated',
        description: 'Stripe account status has been refreshed.',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh status',
      })
    } finally {
      setIsRefreshingStripe(false)
    }
  }

  const handleDisconnectStripe = async () => {
    if (!confirm('Are you sure you want to disconnect Stripe? You can reconnect with a different account.')) {
      return
    }
    
    try {
      await stripeConnectApi.disconnect()
      setStripeStatus(null)
      toast({
        title: 'Stripe disconnected',
        description: 'You can now connect a different Stripe account.',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to disconnect',
      })
    }
  }

  const handleStripeOnboard = async () => {
    try {
      const returnUrl = `${window.location.origin}/club/settings?stripe_return=true`
      const refreshUrl = `${window.location.origin}/club/settings?stripe_refresh=true`
      
      const { onboarding_url } = await stripeConnectApi.onboard({
        return_url: returnUrl,
        refresh_url: refreshUrl,
      })
      
      // Redirect to Stripe onboarding
      window.location.href = onboarding_url
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to start Stripe onboarding',
      })
    }
  }

  const handleCreate = () => {
    setEditingClub(null)
    setIsModalOpen(true)
  }

  const handleEdit = (club: Club) => {
    setEditingClub(club)
    setIsModalOpen(true)
  }

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deletingClub) return

    setIsDeleting(true)
    try {
      await clubsApi.deleteClub(deletingClub.id)
      toast({
        title: 'Club deleted',
        description: `"${deletingClub.name}" has been permanently deleted.`,
      })
      setDeletingClub(null)
      loadClubs()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete club',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSuccess = () => {
    loadClubs() // This will reload clubs and counts
  }
  
  const handleDrinkListsModalClose = async (open: boolean) => {
    if (!open && managingDrinkListsClub) {
      // Reload counts after closing modal
      try {
        const listIds = await clubsApi.getClubDrinkLists(managingDrinkListsClub.id)
        setDrinkListCounts(prev => ({
          ...prev,
          [managingDrinkListsClub.id]: listIds.length
        }))
      } catch (error) {
        // Silently fail - counts will update on next page reload
      }
      setManagingDrinkListsClub(null)
    }
    setIsDrinkListsModalOpen(open)
  }

  const columns: Column<Club>[] = [
    {
      key: 'logo',
      header: '',
      className: 'w-12',
      cell: (club) => (
        <div className="flex items-center">
          <ClubLogo
            logoUrl={club.logo_url}
            logoSettings={club.logo_settings}
            alt={club.name}
            size={40}
          />
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Club Name',
      cell: (club) => (
        <div>
          <div className="font-medium text-sm">{club.name}</div>
          {club.city && (
            <div className="text-xs text-muted-foreground mt-0.5">{club.city}</div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      cell: (club) => (
        <div className="text-sm text-muted-foreground">
          {club.address || '-'}
        </div>
      ),
    },
    {
      key: 'drink_lists',
      header: 'Drink Lists',
      className: 'w-24',
      cell: (club) => {
        const count = drinkListCounts[club.id] ?? 0
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setManagingDrinkListsClub(club)
              setIsDrinkListsModalOpen(true)
            }}
            className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              count > 0
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted/50 text-muted-foreground border border-border/40'
            }`}>
              <List className="h-3 w-3" />
              <span>{count}</span>
            </div>
          </button>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-20',
      cell: (club) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          club.is_active 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {club.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-32 text-right',
      cell: (club) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setManagingDrinkListsClub(club)
              setIsDrinkListsModalOpen(true)
            }}
            className="h-7 w-7 p-0"
            title="Manage Drink Lists"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(club)
            }}
            className="h-7 w-7 p-0"
            title="Edit Club"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingClub(club)
            }}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete Club"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  const settingsTabs = [
    { id: 'clubs', label: 'Clubs', icon: Building2 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as SettingsViewMode)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  viewMode === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
        {viewMode === 'clubs' && (
          <Button variant="dashed" onClick={handleCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create Club
          </Button>
        )}
      </div>

      {/* Clubs View */}
      {viewMode === 'clubs' && (
        <div className="space-y-4">
          {/* Clubs Table */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <DataTable
            data={clubs}
            columns={columns}
            keyExtractor={(club) => club.id}
            emptyMessage="No clubs yet. Create your first club to get started."
          />
        </CardContent>
      </Card>
        </div>
      )}

      {/* Payments View */}
      {viewMode === 'payments' && (
        <div className="space-y-4">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              {isLoadingStripe ? (
                <div className="flex items-center justify-center py-8">
                  <ClubverseLoader size="sm" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Main Status Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img 
                        src="/assets/stripelogo.png" 
                        alt="Stripe" 
                        className="h-5 w-auto"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {stripeStatus?.stripe_account_status === 'active' 
                              ? 'Stripe Connected'
                              : stripeStatus?.stripe_account_status === 'pending_verification'
                              ? 'Verification in Progress'
                              : stripeStatus?.stripe_account_status === 'pending'
                              ? 'Setup Incomplete'
                              : stripeStatus?.stripe_account_status === 'restricted'
                              ? 'Account Restricted'
                              : 'Payment Processing'}
                          </span>
                          {stripeStatus?.stripe_account_status === 'active' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {stripeStatus?.stripe_account_status === 'pending_verification' && (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                          {stripeStatus?.stripe_account_status === 'pending' && (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          {(stripeStatus?.stripe_account_status === 'restricted' || stripeStatus?.stripe_account_status === 'invalid') && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {stripeStatus?.stripe_account_status === 'active' 
                            ? 'Ready to accept card payments'
                            : stripeStatus?.stripe_account_status === 'pending_verification'
                            ? 'Stripe is verifying your account (usually takes a few minutes)'
                            : stripeStatus?.stripe_account_status === 'pending'
                            ? 'Complete Stripe onboarding to accept payments'
                            : stripeStatus?.stripe_account_status === 'restricted'
                            ? 'Your account has restrictions. Please contact Stripe support.'
                            : 'Connect Stripe to accept card payments'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Refresh button */}
                      {stripeStatus?.stripe_account_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshStripeStatus}
                          disabled={isRefreshingStripe}
                          className="h-8 w-8 p-0"
                          title="Refresh status"
                        >
                          <RefreshCw className={cn("h-4 w-4", isRefreshingStripe && "animate-spin")} />
                        </Button>
                      )}
                      
                      {/* Status badge or action button */}
                      {stripeStatus?.stripe_account_status === 'active' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-medium">
                          Active
                        </span>
                      ) : stripeStatus?.stripe_account_status === 'pending_verification' ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={handleStripeOnboard} 
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                          >
                            Update Info
                          </Button>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                            Verifying
                          </span>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleStripeOnboard} 
                          size="sm"
                          className="gap-2 bg-[#635BFF] hover:bg-[#5851EA] text-white"
                        >
                          {stripeStatus?.stripe_account_status === 'pending' ? (
                            <>Complete Setup</>
                          ) : stripeStatus?.stripe_account_status === 'restricted' || stripeStatus?.stripe_account_status === 'invalid' ? (
                            <>Fix Issues</>
                          ) : (
                            <>
                              <CreditCard className="h-3.5 w-3.5" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Detailed Status (when connected) */}
                  {stripeStatus?.stripe_account_id && (
                    <div className="pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              stripeStatus?.stripe_charges_enabled ? "bg-green-500" : "bg-amber-500"
                            )} />
                            <span className="text-muted-foreground">
                              Card Payments: {stripeStatus?.stripe_charges_enabled ? 'Enabled' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              stripeStatus?.stripe_payouts_enabled ? "bg-green-500" : "bg-amber-500"
                            )} />
                            <span className="text-muted-foreground">
                              Payouts: {stripeStatus?.stripe_payouts_enabled ? 'Enabled' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={handleDisconnectStripe}
                          className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Modal */}
      <ClubFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        club={editingClub}
        onSuccess={handleSuccess}
      />

      {/* Drink Lists Association Modal */}
      {managingDrinkListsClub && (
        <ClubDrinkListsModal
          open={isDrinkListsModalOpen}
          onOpenChange={handleDrinkListsModalClose}
          clubId={managingDrinkListsClub.id}
          clubName={managingDrinkListsClub.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingClub}
        onOpenChange={(open) => !open && setDeletingClub(null)}
        title="Delete Club"
        description={
          <>
            Are you sure you want to delete <span className="font-medium text-foreground">{deletingClub?.name}</span>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  )
}

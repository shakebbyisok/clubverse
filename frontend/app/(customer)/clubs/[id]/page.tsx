'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clubsApi } from '@/lib/api/clubs'
import { drinksApi, Drink } from '@/lib/api/drinks'
import { ordersApi } from '@/lib/api/orders'
import { Club, PaymentMethod, Order } from '@/types'
import { ElegantList, ElegantListItem } from '@/components/common/elegant-list'
import { ClubLogo } from '@/components/common/club-logo'
import { Loader2, AlertCircle, ArrowLeft, Wine, MapPin, ShoppingCart, CreditCard, DollarSign } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { QRCodeSVG } from 'qrcode.react'

export default function ClubDrinksPage() {
  const params = useParams()
  const router = useRouter()
  const clubId = params.id as string

  const [club, setClub] = useState<Club | null>(null)
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Map<string, number>>(new Map())
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CARD)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (clubId) {
      loadData()
    }
  }, [clubId])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [clubData, drinksData] = await Promise.all([
        clubsApi.getClub(clubId),
        drinksApi.getClubDrinks(clubId),
      ])
      setClub(clubData)
      setDrinks(drinksData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load club information')
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = (drinkId: string) => {
    setCart(prev => {
      const newCart = new Map(prev)
      newCart.set(drinkId, (newCart.get(drinkId) || 0) + 1)
      return newCart
    })
  }

  const removeFromCart = (drinkId: string) => {
    setCart(prev => {
      const newCart = new Map(prev)
      const current = newCart.get(drinkId) || 0
      if (current <= 1) {
        newCart.delete(drinkId)
      } else {
        newCart.set(drinkId, current - 1)
      }
      return newCart
    })
  }

  const getCartTotal = useMemo(() => {
    let total = 0
    cart.forEach((quantity, drinkId) => {
      const drink = drinks.find(d => d.id === drinkId)
      if (drink) {
        total += parseFloat(drink.price) * quantity
      }
    })
    return total
  }, [cart, drinks])

  const cartItems = useMemo(() => {
    return Array.from(cart.entries())
      .map(([drinkId, quantity]) => {
        const drink = drinks.find(d => d.id === drinkId)
        return drink ? { drink, quantity } : null
      })
      .filter(Boolean) as Array<{ drink: Drink; quantity: number }>
  }, [cart, drinks])

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    setIsCreatingOrder(true)
    try {
      const order = await ordersApi.createOrder({
        club_id: clubId,
        payment_method: paymentMethod,
        items: cartItems.map(({ drink, quantity }) => ({
          drink_id: drink.id,
          quantity,
          price_at_purchase: drink.price,
        })),
      })

      setCreatedOrder(order)
      setCart(new Map())
      
      if (paymentMethod === PaymentMethod.CASH) {
        // QR already generated, show it
        setIsCheckoutOpen(false)
      } else {
        // Card payment - handle Stripe payment
        // TODO: Integrate Stripe Elements here
        toast({
          title: 'Order created',
          description: 'Please complete payment',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create order',
      })
    } finally {
      setIsCreatingOrder(false)
    }
  }

  // Format drinks for ElegantList
  const drinkListItems = useMemo((): ElegantListItem[] => {
    return drinks.map((drink) => {
      const quantity = cart.get(drink.id) || 0
      return {
        id: drink.id,
        title: drink.name,
        subtitle: drink.category ? drink.category.charAt(0).toUpperCase() + drink.category.slice(1) : undefined,
        description: `$${parseFloat(drink.price).toFixed(2)}`,
        icon: drink.image_url ? (
          <img
            src={drink.image_url}
            alt={drink.name}
            className="w-10 h-10 object-contain rounded-[var(--radius)] bg-background p-1"
          />
        ) : (
          <div className="w-10 h-10 rounded-[var(--radius)] bg-muted/50 flex items-center justify-center">
            <Wine className="h-5 w-5 text-muted-foreground" />
          </div>
        ),
        badge: drink.is_available ? (quantity > 0 ? quantity : undefined) : undefined,
      }
    })
  }, [drinks, cart])

  if (isLoading) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading menu...</p>
        </div>
      </div>
    )
  }

  if (error || !club) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || 'Club not found'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ClubLogo
              logoUrl={club.logo_url}
              logoSettings={club.logo_settings}
              alt={club.name}
              size={40}
              containerClassName="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold truncate">{club.name}</h1>
              {club.city && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" />
                  <span>{club.city}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drinks List */}
      <div className="px-4 py-4 pb-24">
        {drinks.length === 0 ? (
          <div className="text-center py-12">
            <Wine className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">No drinks available</h3>
            <p className="text-sm text-muted-foreground">
              This club hasn't added any drinks yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {drinkListItems.map((item) => {
              const quantity = cart.get(item.id) || 0
              const drink = drinks.find(d => d.id === item.id)
              const isAvailable = drink?.is_available ?? false
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] bg-card/50 border border-border/40 transition-all",
                    isAvailable && "hover:bg-accent/50 hover:border-border/60",
                    !isAvailable && "opacity-60"
                  )}
                >
                  {/* Icon */}
                  {item.icon && (
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                      {item.icon}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {item.title}
                      </h3>
                      {quantity > 0 && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                          {quantity}
                        </span>
                      )}
                      {!isAvailable && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                          Unavailable
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Cart Controls */}
                  {isAvailable && (
                    <div className="flex items-center gap-2">
                      {quantity > 0 ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFromCart(item.id)
                            }}
                          >
                            -
                          </Button>
                          <span className="text-sm font-medium min-w-[24px] text-center">{quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(item.id)
                            }}
                          >
                            +
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToCart(item.id)
                          }}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Footer */}
      {cart.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border/40 p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm font-medium">
                {Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0)} item(s)
              </span>
              <span className="text-sm font-semibold">
                ${getCartTotal.toFixed(2)}
              </span>
            </div>
            <Button onClick={() => setIsCheckoutOpen(true)} size="sm">
              Checkout
            </Button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Review your order and select payment method
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pb-2 space-y-4">
            {/* Order Items */}
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {cartItems.map(({ drink, quantity }) => (
                <div key={drink.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {quantity}x {drink.name}
                  </span>
                  <span className="font-medium text-foreground">
                    ${(parseFloat(drink.price) * quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">${getCartTotal.toFixed(2)}</span>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:bg-accent/30 transition-colors">
                    <RadioGroupItem value={PaymentMethod.CARD} id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 flex-1 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      <span>Pay with Card</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:bg-accent/30 transition-colors">
                    <RadioGroupItem value={PaymentMethod.CASH} id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-2 flex-1 cursor-pointer">
                      <DollarSign className="h-4 w-4" />
                      <span>Pay in Bar</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row justify-between">
            <Button
              variant="outline"
              onClick={() => setIsCheckoutOpen(false)}
              disabled={isCreatingOrder}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={isCreatingOrder}
              className="gap-2"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Success Modal (for cash payments) */}
      <Dialog open={!!createdOrder && createdOrder.payment_method === PaymentMethod.CASH} onOpenChange={(open) => !open && setCreatedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Placed!</DialogTitle>
            <DialogDescription>
              Show this QR code to the bartender to pay
            </DialogDescription>
          </DialogHeader>

          {createdOrder?.qr_code && (
            <div className="px-4 pb-2 space-y-4">
              <div className="flex justify-center p-6 bg-background rounded-lg border border-border/40">
                <QRCodeSVG
                  value={createdOrder.qr_code}
                  size={200}
                  level="M"
                  includeMargin={true}
                  fgColor="hsl(var(--foreground))"
                  bgColor="hsl(var(--background))"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Total: ${parseFloat(createdOrder.total_amount).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pay with cash when you receive your order
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCreatedOrder(null)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


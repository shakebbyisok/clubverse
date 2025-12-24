'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clubsApi } from '@/lib/api/clubs'
import { drinksApi, Drink } from '@/lib/api/drinks'
import { categoriesApi, Category } from '@/lib/api/categories'
import { ordersApi } from '@/lib/api/orders'
import { Club, PaymentMethod, Order } from '@/types'
import { ClubLogo } from '@/components/common/club-logo'
import { 
  AlertCircle, 
  ArrowLeft, 
  Wine, 
  MapPin, 
  ShoppingCart, 
  CreditCard, 
  DollarSign,
  Minus,
  Plus,
  Loader2
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { migrateImagePath } from '@/lib/utils/image-path'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { QRCodeSVG } from 'qrcode.react'
import { ClubverseLoader } from '@/components/common/clubverse-loader'

interface CategoryWithDrinks extends Category {
  drinks: Drink[]
}

export default function ClubDrinksPage() {
  const params = useParams()
  const router = useRouter()
  const clubId = params.id as string

  const [club, setClub] = useState<Club | null>(null)
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Map<string, number>>(new Map())
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CARD)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const { toast } = useToast()
  
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const tabsRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [clubData, drinksData, categoryTree] = await Promise.all([
        clubsApi.getClub(clubId),
        drinksApi.getClubDrinks(clubId),
        categoriesApi.getClubCategories(clubId),
      ])
      setClub(clubData)
      setDrinks(drinksData)
      // Combine system and custom categories
      const allCategories = [...categoryTree.system_categories, ...categoryTree.custom_categories]
        .sort((a, b) => a.display_order - b.display_order)
      setCategories(allCategories)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load club information')
    } finally {
      setIsLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    if (clubId) {
      loadData()
    }
  }, [clubId, loadData])

  // Group drinks by category
  const categorizedDrinks = useMemo((): CategoryWithDrinks[] => {
    const availableDrinks = drinks.filter(d => d.is_available)
    
    // Create a map of category_id to drinks
    const drinksByCategory = new Map<string, Drink[]>()
    const uncategorized: Drink[] = []
    
    availableDrinks.forEach(drink => {
      if (drink.category_id) {
        const existing = drinksByCategory.get(drink.category_id) || []
        existing.push(drink)
        drinksByCategory.set(drink.category_id, existing)
      } else {
        uncategorized.push(drink)
      }
    })
    
    // Build categories with drinks
    const result: CategoryWithDrinks[] = categories
      .filter(cat => drinksByCategory.has(cat.id))
      .map(cat => ({
        ...cat,
        drinks: drinksByCategory.get(cat.id) || [],
      }))
    
    // Add uncategorized drinks if any
    if (uncategorized.length > 0) {
      result.push({
        id: 'uncategorized',
        name: 'Other',
        description: null,
        icon: null,
        display_order: 999,
        is_system: false,
        is_active: true,
        subcategories: [],
        created_at: '',
        drinks: uncategorized,
      } as CategoryWithDrinks)
    }
    
    return result
  }, [drinks, categories])

  // Set initial active category
  useEffect(() => {
    if (categorizedDrinks.length > 0 && !activeCategory) {
      setActiveCategory(categorizedDrinks[0].id)
    }
  }, [categorizedDrinks, activeCategory])

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)
    const ref = categoryRefs.current.get(categoryId)
    if (ref) {
      const headerHeight = 120 // Account for sticky header + tabs
      const y = ref.getBoundingClientRect().top + window.scrollY - headerHeight
      window.scrollTo({ top: y, behavior: 'smooth' })
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

  const cartItemCount = useMemo(() => {
    return Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0)
  }, [cart])

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
      // Build success/cancel URLs for Stripe Checkout
      const baseUrl = window.location.origin
      const successUrl = `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${baseUrl}/clubs/${clubId}?cancelled=true`

      const order = await ordersApi.createOrder({
        club_id: clubId,
        payment_method: paymentMethod,
        success_url: successUrl,
        cancel_url: cancelUrl,
        items: cartItems.map(({ drink, quantity }) => ({
          drink_id: drink.id,
          quantity,
          price_at_purchase: drink.price,
        })),
      })

      if (paymentMethod === PaymentMethod.CASH) {
        // Cash payment - show QR code
        setCreatedOrder(order)
        setCart(new Map())
        setIsCheckoutOpen(false)
      } else if (order.checkout_url) {
        // Card payment - redirect to Stripe Checkout
        setCart(new Map())
        setIsCheckoutOpen(false)
        window.location.href = order.checkout_url
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Payment URL not available. Please try again.',
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

  if (isLoading) {
    return <ClubverseLoader fullScreen />
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
    <div className="min-h-screen pb-32 bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-white/[0.06]">
        {/* Club Info Header */}
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-white/70" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center overflow-hidden">
              <ClubLogo
                logoUrl={club.logo_url}
                logoSettings={club.logo_settings}
                alt={club.name}
                size={32}
                containerClassName="w-8 h-8"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-semibold text-white truncate tracking-tight">{club.name}</h1>
              {club.city && (
                <div className="flex items-center gap-1 text-[11px] text-white/40 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  <span>{club.city}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Cart Badge in Header */}
          {cartItemCount > 0 && (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="relative h-9 w-9 flex items-center justify-center rounded-full bg-white text-black"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {cartItemCount}
              </span>
            </button>
          )}
        </div>

        {/* Category Tabs */}
        {categorizedDrinks.length > 0 && (
          <div 
            ref={tabsRef}
            className="flex overflow-x-auto scrollbar-hide px-4 pb-3 gap-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categorizedDrinks.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap",
                  activeCategory === cat.id
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white/80"
                )}
              >
                {cat.name}
                <span className="ml-1.5 text-[11px] opacity-60">{cat.drinks.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Drinks Content */}
      <div className="px-4 py-4">
        {categorizedDrinks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Wine className="h-8 w-8 text-white/20" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No drinks available</h3>
            <p className="text-sm text-white/40">
              This venue hasn&apos;t added any drinks yet
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {categorizedDrinks.map((category) => (
              <div
                key={category.id}
                ref={(el) => {
                  if (el) categoryRefs.current.set(category.id, el)
                }}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    {category.name}
                  </h2>
                  <span className="text-xs text-white/30 tabular-nums">
                    {category.drinks.length} {category.drinks.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Drinks Grid */}
                <div className="space-y-2">
                  {category.drinks.map((drink) => {
                    const quantity = cart.get(drink.id) || 0
                    
                    return (
                      <div
                        key={drink.id}
                        className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
                      >
                        {/* Drink Image */}
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center overflow-hidden">
                          {drink.image_url ? (
                            <img
                              src={migrateImagePath(drink.image_url) || drink.image_url}
                              alt={drink.name}
                              className="w-12 h-12 object-contain"
                              onError={(e) => {
                                if (e.currentTarget.src !== drink.image_url) {
                                  e.currentTarget.src = drink.image_url || ''
                                }
                              }}
                            />
                          ) : (
                            <Wine className="h-6 w-6 text-white/20" />
                          )}
                        </div>

                        {/* Drink Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-medium text-white truncate">
                            {drink.name}
                          </h3>
                          {drink.brand_name && (
                            <p className="text-[12px] text-white/40 truncate mt-0.5">
                              {drink.brand_name}
                            </p>
                          )}
                          <p className="text-[14px] font-semibold text-white/80 mt-1 tabular-nums">
                            ${parseFloat(drink.price).toFixed(2)}
                          </p>
                        </div>

                        {/* Cart Controls */}
                        <div className="flex-shrink-0">
                          {quantity > 0 ? (
                            <div className="flex items-center gap-1 bg-white/[0.08] rounded-full p-1">
                              <button
                                onClick={() => removeFromCart(drink.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/[0.1] hover:bg-white/[0.15] transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5 text-white" />
                              </button>
                              <span className="w-8 text-center text-[14px] font-semibold text-white tabular-nums">
                                {quantity}
                              </span>
                              <button
                                onClick={() => addToCart(drink.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(drink.id)}
                              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.12] transition-colors group-hover:bg-white group-hover:text-black"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Footer - Compact */}
      {cart.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-20">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-full bg-white text-black shadow-2xl shadow-black/50 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 flex items-center justify-center rounded-full bg-black text-white text-[12px] font-bold tabular-nums">
                {cartItemCount}
              </div>
              <span className="text-[15px] font-semibold tracking-tight">View Order</span>
            </div>
            <span className="text-[15px] font-bold tabular-nums">${getCartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-sm bg-[#0a0a0a] border-white/[0.08] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <DialogTitle className="text-[17px] font-semibold text-white">Order Summary</DialogTitle>
          </div>

          {/* Order Items - Compact */}
          <div className="px-5 py-3 max-h-[200px] overflow-y-auto">
            {cartItems.map(({ drink, quantity }) => (
              <div key={drink.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-white/50 w-5 tabular-nums">{quantity}×</span>
                  <span className="text-[14px] text-white truncate">{drink.name}</span>
                </div>
                <span className="text-[14px] text-white/70 tabular-nums ml-3">
                  ${(parseFloat(drink.price) * quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[13px] text-white/50">Total</span>
            <span className="text-[18px] font-bold text-white tabular-nums">${getCartTotal.toFixed(2)}</span>
          </div>

          {/* Payment Method - Compact Pills */}
          <div className="px-5 pb-4">
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} 
              className="flex gap-2"
            >
              <label className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full cursor-pointer transition-all text-[13px] font-medium",
                paymentMethod === PaymentMethod.CARD 
                  ? "bg-white text-black" 
                  : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"
              )}>
                <RadioGroupItem value={PaymentMethod.CARD} id="card" className="sr-only" />
                <CreditCard className="h-4 w-4" />
                <span>Card</span>
              </label>
              <label className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full cursor-pointer transition-all text-[13px] font-medium",
                paymentMethod === PaymentMethod.CASH 
                  ? "bg-white text-black" 
                  : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"
              )}>
                <RadioGroupItem value={PaymentMethod.CASH} id="cash" className="sr-only" />
                <DollarSign className="h-4 w-4" />
                <span>Pay at Bar</span>
              </label>
            </RadioGroup>
          </div>

          {/* Action Button */}
          <div className="px-5 pb-5">
            <button
              onClick={handleCheckout}
              disabled={isCreatingOrder}
              className="w-full py-3.5 rounded-full bg-white text-black font-semibold text-[15px] hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Place Order · ${getCartTotal.toFixed(2)}</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Success Modal (for cash payments) */}
      <Dialog open={!!createdOrder && createdOrder.payment_method === PaymentMethod.CASH} onOpenChange={(open) => !open && setCreatedOrder(null)}>
        <DialogContent className="max-w-xs bg-[#0a0a0a] border-white/[0.08] p-0 gap-0 overflow-hidden">
          {/* QR Code */}
          {createdOrder?.qr_code && (
            <>
              <div className="p-6">
                <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
                  <QRCodeSVG
                    value={createdOrder.qr_code}
                    size={160}
                    level="M"
                    includeMargin={false}
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
              
              <div className="px-6 pb-4 text-center">
                <p className="text-[11px] uppercase tracking-widest text-white/30 mb-1">Total</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  ${parseFloat(createdOrder.total_amount).toFixed(2)}
                </p>
                <p className="text-[12px] text-white/40 mt-2">
                  Show QR to bartender
                </p>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => setCreatedOrder(null)} 
                  className="w-full py-3 rounded-full bg-white text-black font-semibold text-[14px] hover:bg-white/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

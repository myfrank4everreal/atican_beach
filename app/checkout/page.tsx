'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CreditCard, Loader2, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const getTotal = useCartStore((s) => s.getTotal)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paystackConfigured, setPaystackConfigured] = useState<boolean | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null)

  const total = getTotal()

  // Check if Paystack is configured on mount
  useEffect(() => {
    const checkPaystackConfig = async () => {
      try {
        const res = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@test.com',
            amount: 100,
            bookingReference: 'test',
          }),
        })
        const data = await res.json()
        // If we get a specific error code, Paystack is not configured
        if (data.code === 'PAYSTACK_NOT_CONFIGURED') {
          setPaystackConfigured(false)
        } else {
          setPaystackConfigured(true)
        }
      } catch {
        setPaystackConfigured(false)
      }
    }
    checkPaystackConfig()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create booking first
      const bookingRes = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            specialRequests: formData.specialRequests,
          },
          items: items.map((item) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            metadata: item.metadata,
          })),
          totalAmount: total,
        }),
      })

      const bookingData = await bookingRes.json()

      if (!bookingData.success) {
        throw new Error(bookingData.error || 'Failed to create booking')
      }

      // If Paystack is not configured, show success message
      if (paystackConfigured === false) {
        setBookingSuccess(bookingData.booking.reference)
        setLoading(false)
        return
      }

      // Initialize Paystack payment
      const paystackRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          amount: total,
          bookingReference: bookingData.booking.reference,
          callbackUrl: `${window.location.origin}/booking/confirmation?ref=${bookingData.booking.reference}`,
        }),
      })

      const paystackData = await paystackRes.json()

      if (!paystackData.success) {
        throw new Error(paystackData.error || 'Payment initialization failed')
      }

      window.location.href = paystackData.authorization_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#082032] mb-4">Your cart is empty</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-[#0A3D62] text-white px-6 py-3 rounded-lg hover:bg-[#08324f] transition-colors"
          >
            Browse Rooms & Services
          </button>
        </div>
      </div>
    )
  }

  // Show booking success message
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#082032] mb-2">Booking Created!</h1>
          <p className="text-gray-600 mb-4">
            Your booking reference is: <strong>{bookingSuccess}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Our team will contact you shortly to arrange payment. Please keep your booking reference for reference.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#0A3D62] text-white px-6 py-3 rounded-lg hover:bg-[#08324f] transition-colors"
          >
            Return to Home
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#0A3D62] to-[#F97316] p-6 text-white">
            <h1 className="text-2xl font-bold">Complete Your Booking</h1>
            <p className="text-blue-100 mt-1">Review your items and provide guest details</p>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#082032] mb-4">Order Summary</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-[#F5F1E8] rounded-lg">
                    <div>
                      <p className="font-medium text-[#082032]">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.type.replace('_', ' ')} × {item.quantity}</p>
                      {item.metadata.checkIn && (
                        <p className="text-xs text-gray-400">{item.metadata.checkIn} → {item.metadata.checkOut}</p>
                      )}
                    </div>
                    <p className="font-semibold text-[#0A3D62]">₦{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-lg font-semibold text-[#082032]">Total</span>
                <span className="text-2xl font-bold text-[#0A3D62]">₦{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Status Notice */}
            {paystackConfigured === false && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium">Payment System Not Configured</p>
                    <p className="text-amber-700 text-sm mt-1">
                      Online payments are currently unavailable. Please complete your booking and our team will contact you for alternative payment arrangements.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold text-[#082032]">Guest Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent" placeholder="+234 800 000 0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent"
                  placeholder="Any special requests or preferences..." />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-[#0A3D62] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#08324f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Processing...</>) : paystackConfigured === false ? (<><Info className="w-5 h-5" />Complete Booking (Payment Offline)</>) : (<><CreditCard className="w-5 h-5" />Pay ₦{total.toLocaleString()} with Paystack</>)}
              </button>

              <p className="text-center text-sm text-gray-500">
                {paystackConfigured === false 
                  ? 'Your booking will be created. Our team will contact you for payment arrangements.'
                  : 'Secure payment powered by Paystack. You will be redirected to complete payment.'
                }
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
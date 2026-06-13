import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import paystack from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, amount, bookingReference, callbackUrl } = body as {
      email: string
      amount: number
      bookingReference: string
      callbackUrl?: string
    }

    if (!email || !amount || !bookingReference) {
      return NextResponse.json(
        { error: 'Missing required fields: email, amount, bookingReference' },
        { status: 400 }
      )
    }

    // Check if Paystack is configured
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
    const NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

    if (!PAYSTACK_SECRET_KEY || !NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      return NextResponse.json(
        { 
          error: 'Payment system not configured. Please contact the administrator.',
          code: 'PAYSTACK_NOT_CONFIGURED' 
        },
        { status: 503 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_reference, total_amount, status')
      .eq('booking_reference', bookingReference)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Booking is not in pending status' },
        { status: 400 }
      )
    }

    const paystackParams: {
      email: string
      amount: number
      reference?: string
      callback_url?: string
      metadata?: Record<string, unknown>
    } = {
      email,
      amount: amount * 100,
      reference: bookingReference,
      metadata: {
        booking_reference: bookingReference,
        booking_id: booking.id,
      },
    }

    if (callbackUrl) paystackParams.callback_url = callbackUrl

    const response = await paystack.initialize(paystackParams)

    if (!response.status) {
      return NextResponse.json(
        { error: response.message || 'Payment initialization failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      authorization_url: response.data.authorization_url,
      reference: response.data.reference,
    })
  } catch (error) {
    console.error('Paystack initialize error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
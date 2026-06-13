import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Check if Paystack is configured
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

    if (!PAYSTACK_SECRET_KEY) {
      console.warn('⚠️ Paystack webhook received but PAYSTACK_SECRET_KEY is not configured')
      // Still return success to avoid webhook retries, but log the issue
      return NextResponse.json({ 
        success: true, 
        message: 'Paystack not configured - webhook ignored' 
      })
    }

    const body = await request.text()
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex')

    const signature = request.headers.get('x-paystack-signature')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)

    if (event.event === 'charge.success') {
      const { reference, status } = event.data

      if (status === 'success') {
        const supabase = createAdminClient()

        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            payment_reference: reference,
            updated_at: new Date().toISOString(),
          })
          .eq('booking_reference', reference)
          .eq('status', 'pending')

        if (updateError) {
          console.error('Failed to update booking:', updateError)
          return NextResponse.json({ error: 'Update failed' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
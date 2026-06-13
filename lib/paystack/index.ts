// Make Paystack optional - only initialize if keys are configured
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

const isPaystackConfigured = !!(PAYSTACK_SECRET_KEY && NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY)

let paystack: any = null

if (isPaystackConfigured) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Paystack = require('@paystack/paystack-sdk').default
  paystack = new Paystack({ secretKey: PAYSTACK_SECRET_KEY })
}

// Wrapper to handle unconfigured Paystack gracefully
const paystackWrapper = {
  initialize: async (params: any) => {
    if (!isPaystackConfigured) {
      return {
        status: false,
        message: 'Paystack is not configured. Please set PAYSTACK_SECRET_KEY and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY environment variables.',
        data: null,
      }
    }
    return paystack.initialize(params)
  },
}

export default paystackWrapper
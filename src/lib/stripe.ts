import Stripe from 'stripe'

// Server-side Stripe client — only import in API routes / server components
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

// Price IDs — set these in .env after creating products in Stripe Dashboard
export const PRICES = {
  NPGX_MONTHLY: 'price_1TCHK6GabWQ1ZIH3CxrT5O5R',
  MAGAZINE_MONTHLY: process.env.STRIPE_PRICE_MAGAZINE_MONTHLY || '',
  MAGAZINE_SINGLE: process.env.STRIPE_PRICE_MAGAZINE_SINGLE || '',
} as const

// Product config (for Stripe Dashboard setup reference)
export const PRODUCTS = {
  MAGAZINE_ALL_ACCESS: {
    name: 'NPGX Magazine — All Access',
    description: 'Unlimited access to all NPGX Magazine issues, photoshoots, and editorial content.',
    price: 3000, // $30.00 in cents
    interval: 'month' as const,
  },
  MAGAZINE_SINGLE_ISSUE: {
    name: 'NPGX Magazine — Single Issue',
    description: 'One-time purchase of a single NPGX Magazine issue.',
    price: 1000, // $10.00 in cents
  },
  ONE_SHOT: {
    name: 'NPGX One-Shot Generator',
    description: 'Create your own custom NPGX character with full photoshoot and backstory.',
    price: 9900, // $99.00 in cents
  },
  SUPPORT_BUG: {
    name: 'NPGX Support — Bug Fix',
    description: 'Fix a broken feature on the NPGX platform. 24-48hr turnaround.',
    price: 4900, // $49.00
  },
  SUPPORT_FEATURE: {
    name: 'NPGX Support — Feature Build',
    description: 'Build a new feature on the NPGX platform. 3-5 day turnaround.',
    price: 14900, // $149.00
  },
  SUPPORT_PRIORITY: {
    name: 'NPGX Support — Priority Build',
    description: 'Rush build or fix. Top of the queue. 24hr turnaround.',
    price: 49900, // $499.00
  },
} as const

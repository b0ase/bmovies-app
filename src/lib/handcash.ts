import { HandCashConnect } from '@handcash/handcash-connect'

const APP_ID = process.env.HANDCASH_APP_ID || ''
const APP_SECRET = process.env.HANDCASH_APP_SECRET || ''

function getConnect() {
  if (!APP_ID || !APP_SECRET) {
    throw new Error('Missing HANDCASH_APP_ID or HANDCASH_APP_SECRET env vars')
  }
  return new HandCashConnect({ appId: APP_ID, appSecret: APP_SECRET })
}

export function getRedirectUrl(returnTo: string) {
  const connect = getConnect()
  return connect.getRedirectionUrl({ returnTo })
}

export async function getUserProfile(authToken: string) {
  const connect = getConnect()
  const account = connect.getAccountFromAuthToken(authToken)
  const profile = await account.profile.getCurrentProfile()
  return {
    handle: profile.publicProfile.handle,
    displayName: profile.publicProfile.displayName,
    avatarUrl: profile.publicProfile.avatarUrl,
  }
}

export async function chargeUser(
  authToken: string,
  payments: Array<{ destination: string; amount: number; currencyCode: string }>,
  description: string
): Promise<string> {
  const connect = getConnect()
  const account = connect.getAccountFromAuthToken(authToken)
  const result = await account.wallet.pay({
    payments: payments.map(p => ({
      destination: p.destination,
      sendAmount: p.amount,
      currencyCode: p.currencyCode as 'USD' | 'GBP' | 'EUR',
    })),
    description,
  })
  return result.transactionId
}

export async function getPermissions(authToken: string) {
  const connect = getConnect()
  const account = connect.getAccountFromAuthToken(authToken)
  return account.profile.getPermissions()
}

export const PLATFORM_HANDLE = process.env.PLATFORM_HANDCASH_HANDLE || 'NinjaPunkGirlsX'
export const PRESS_PRICE_USD = 0.01

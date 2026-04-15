// End-to-end smoke test of the BRC-100 sign-in flow without a real wallet.
// Simulates what BSV Desktop would do: sign the server nonce with a derived
// key, POST to /verify, assert a session is minted.
import { PrivateKey, PublicKey, Hash, ECDSA, Utils, BigNumber } from '@bsv/sdk'

const BASE = process.env.BASE_URL || 'http://localhost:4717'

// Pass TEST_WIF=<wif> to run against a fixed key (exercises the
// returning-user signInWithPassword branch); omit for a fresh key
// on every run (exercises the createUser branch).
const priv = process.env.TEST_WIF
  ? PrivateKey.fromWif(process.env.TEST_WIF)
  : PrivateKey.fromRandom()
const pub = priv.toPublicKey()
console.log('  wif      :', priv.toWif())
const publicKeyHex = pub.toString()
const address = pub.toAddress().toString()

console.log('Smoke test key')
console.log('  address  :', address)
console.log('  publicKey:', publicKeyHex)

// 1. Get a challenge
const chalRes = await fetch(`${BASE}/api/auth/brc100/challenge`, { method: 'POST' })
if (!chalRes.ok) {
  console.error('challenge failed:', chalRes.status, await chalRes.text())
  process.exit(1)
}
const setCookie = chalRes.headers.get('set-cookie')
const cookieValue = setCookie?.split(';')[0] // "brc100-nonce=<uuid>"
const { challenge } = await chalRes.json()
console.log('  challenge:', challenge)
console.log('  cookie   :', cookieValue)

// 2. Sign the challenge exactly the way BRC-100 createSignature would
const data = Utils.toArray(challenge, 'utf8')
const hash = Hash.sha256(data)
const signature = ECDSA.sign(new BigNumber(hash), priv, true).toDER('hex')
console.log('  sig (DER):', signature.slice(0, 32) + '…')

// 3. Call /verify
const verifyRes = await fetch(`${BASE}/api/auth/brc100/verify`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    cookie: cookieValue,
  },
  body: JSON.stringify({
    address,
    publicKey: publicKeyHex,
    challenge,
    signature,
    provider: 'metanet',
  }),
})

const body = await verifyRes.json().catch(() => ({ error: 'not json' }))
console.log('\n/verify →', verifyRes.status)
console.log(JSON.stringify(body, null, 2))

if (verifyRes.ok && body.access_token) {
  console.log('\n✅ BRC-100 sign-in end-to-end: OK')
  process.exit(0)
} else {
  console.log('\n❌ sign-in failed')
  process.exit(1)
}

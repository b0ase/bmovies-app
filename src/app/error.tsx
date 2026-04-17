'use client'

/**
 * App-level error boundary — last line of defence for anything under the
 * Next.js app tree that isn't caught by a more specific boundary (like
 * /account/error.tsx). Keeps the user out of the default
 * "Application error: a client-side exception has occurred" white screen.
 */

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/error-boundary]', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#e5e5e5',
        fontFamily: '-apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E50914', fontWeight: 700, marginBottom: 8 }}>
          Unexpected error
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, marginBottom: 12 }}>
          bMovies hit an error.
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20 }}>
          Reload to recover. If it keeps happening, the digest below
          helps us track it down.
        </p>
        {error.message && (
          <pre
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              padding: 12,
              marginBottom: 16,
              fontSize: '0.75rem',
              color: '#666',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
            {error.digest && `\n\n(ref: ${error.digest})`}
          </pre>
        )}
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            background: '#E50914',
            color: '#fff',
            border: 'none',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
        <a
          href="/"
          style={{
            marginLeft: 8,
            padding: '0.5rem 1rem',
            background: 'transparent',
            color: '#fff',
            border: '1px solid #333',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Home
        </a>
      </div>
    </div>
  )
}

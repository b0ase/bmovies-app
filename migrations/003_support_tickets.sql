-- Support tickets for paid bug fixes / feature requests
CREATE TABLE IF NOT EXISTS npgx_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'priority')),
  description TEXT NOT NULL,
  page_url TEXT,
  email TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'submitted', 'in_progress', 'completed', 'refunded', 'cancelled')),
  stripe_session_id TEXT,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON npgx_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON npgx_support_tickets(email);

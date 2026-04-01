CREATE TABLE IF NOT EXISTS crm_users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(140) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('sdr', 'closer', 'manager')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_sessions (
  token UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES crm_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_tickets (
  id UUID PRIMARY KEY,
  company_name VARCHAR(140) NOT NULL,
  owner_name VARCHAR(120) NOT NULL,
  source_channel VARCHAR(50) NOT NULL,
  deal_value NUMERIC(12,2) NOT NULL CHECK (deal_value > 0),
  stage VARCHAR(20) NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead', 'proposal', 'negotiation', 'won', 'lost')),
  target_date DATE NOT NULL,
  lost_reason VARCHAR(180),
  created_by UUID NOT NULL REFERENCES crm_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_ticket_history (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES crm_tickets(id) ON DELETE CASCADE,
  from_stage VARCHAR(20) NOT NULL,
  to_stage VARCHAR(20) NOT NULL,
  reason VARCHAR(180) NOT NULL,
  changed_by UUID NOT NULL REFERENCES crm_users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_sessions_user ON crm_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_stage ON crm_tickets(stage);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_owner ON crm_tickets(owner_name);
CREATE INDEX IF NOT EXISTS idx_crm_history_ticket ON crm_ticket_history(ticket_id);

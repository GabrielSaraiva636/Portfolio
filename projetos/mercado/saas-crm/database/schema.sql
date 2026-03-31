CREATE TABLE IF NOT EXISTS crm_tickets (
  id UUID PRIMARY KEY,
  company_name VARCHAR(140) NOT NULL,
  owner_name VARCHAR(120) NOT NULL,
  source_channel VARCHAR(50) NOT NULL,
  deal_value NUMERIC(12,2) NOT NULL CHECK (deal_value > 0),
  stage VARCHAR(20) NOT NULL DEFAULT 'lead',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_tickets_stage ON crm_tickets(stage);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_owner ON crm_tickets(owner_name);

-- Add missing columns for V1 Extended Approval Flow
ALTER TABLE approval_flows 
ADD COLUMN IF NOT EXISTS name VARCHAR(200) DEFAULT 'Default Flow',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS conditions JSONB,
ADD COLUMN IF NOT EXISTS approver_steps JSONB,
ADD COLUMN IF NOT EXISTS allow_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS effective_from DATE,
ADD COLUMN IF NOT EXISTS effective_to DATE;

-- Update name column to NOT NULL after adding default values (Optional / Safety)
UPDATE approval_flows SET name = 'Default Flow' WHERE name IS NULL;

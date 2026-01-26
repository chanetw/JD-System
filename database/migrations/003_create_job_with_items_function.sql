-- ========================================
-- Migration 003: Create Job with Items (Transaction)
-- Purpose: สร้าง job พร้อม items ในรูปแบบ transaction เดียว
-- Created: 2026-01-26
-- ========================================

-- Drop function if exists
DROP FUNCTION IF EXISTS create_job_with_items(JSONB, JSONB);

-- Create function
CREATE OR REPLACE FUNCTION create_job_with_items(
  p_job_data JSONB,
  p_items_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id INT;
  v_result JSONB;
BEGIN
  -- 1. Insert Job
  INSERT INTO jobs (
    tenant_id,
    project_id,
    job_type_id,
    subject,
    objective,
    description,
    headline,
    sub_headline,
    priority,
    status,
    requester_id,
    due_date,
    created_at
  )
  VALUES (
    (p_job_data->>'tenant_id')::INT,
    (p_job_data->>'project_id')::INT,
    (p_job_data->>'job_type_id')::INT,
    p_job_data->>'subject',
    p_job_data->>'objective',
    p_job_data->>'description',
    p_job_data->>'headline',
    p_job_data->>'sub_headline',
    COALESCE(p_job_data->>'priority', 'normal'),
    COALESCE(p_job_data->>'status', 'pending_approval'),
    (p_job_data->>'requester_id')::INT,
    (p_job_data->>'due_date')::TIMESTAMP,
    NOW()
  )
  RETURNING id INTO v_job_id;

  -- 2. Insert Design Job Items
  INSERT INTO design_job_items (
    job_id,
    job_type_item_id,
    name,
    quantity,
    status,
    created_at
  )
  SELECT
    v_job_id,
    (item->>'job_type_item_id')::INT,
    item->>'name',
    (item->>'quantity')::INT,
    COALESCE(item->>'status', 'pending'),
    NOW()
  FROM jsonb_array_elements(p_items_data) AS item;

  -- 3. Return job data
  SELECT jsonb_build_object(
    'id', id,
    'dj_id', dj_id,
    'subject', subject,
    'status', status,
    'created_at', created_at
  ) INTO v_result
  FROM jobs
  WHERE id = v_job_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction จะ rollback อัตโนมัติ
    RAISE EXCEPTION 'Failed to create job with items: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_job_with_items(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_job_with_items(JSONB, JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION create_job_with_items IS 'สร้าง job พร้อม items ในรูปแบบ transaction เดียว เพื่อป้องกัน orphaned records';

-- ========================================
-- Test Query (Optional)
-- ========================================
/*
SELECT create_job_with_items(
  '{"tenant_id": 1, "project_id": 1, "job_type_id": 1, "subject": "Test Job", "requester_id": 1, "due_date": "2026-02-01"}'::jsonb,
  '[{"job_type_item_id": 1, "name": "Item 1", "quantity": 1}]'::jsonb
);
*/

-- Add paired_with_turn_id to track half-turn pairings
-- When a half-turn is completed, the next service pairs with it on the same turn row

ALTER TABLE turns ADD COLUMN paired_with_turn_id UUID REFERENCES turns(id);

-- Index for efficient lookup of unpaired half-turns
CREATE INDEX idx_turns_paired_lookup ON turns(employee_id, session_id, is_half_turn, status)
  WHERE paired_with_turn_id IS NULL;

COMMENT ON COLUMN turns.paired_with_turn_id IS 'References the half-turn this service is paired with. Both turns share the same turn_number.';

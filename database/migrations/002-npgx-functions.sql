-- NPGX Staking Functions
-- Helper functions for dividend distribution and member summary updates

-- Update member staking summary
-- Aggregates current stakes and updates denormalized fields on npgx_members
CREATE OR REPLACE FUNCTION update_npgx_member_staking_summary(p_user_handle TEXT)
RETURNS void AS $$
DECLARE
  v_total_staked BIGINT;
  v_active_count INT;
BEGIN
  -- Calculate totals from active stakes
  SELECT
    COALESCE(SUM(amount_npgx), 0),
    COUNT(*)
  INTO v_total_staked, v_active_count
  FROM npgx_stakes
  WHERE user_handle = p_user_handle
    AND status = 'active';

  -- Update member record
  UPDATE npgx_members
  SET
    total_npgx_staked = v_total_staked,
    active_stake_count = v_active_count,
    updated_at = NOW()
  WHERE user_handle = p_user_handle;
END;
$$ LANGUAGE plpgsql;

-- Calculate dividend allocations for a distribution
-- Snapshots all active stakers and allocates proportionally based on staked amount
CREATE OR REPLACE FUNCTION calculate_npgx_dividend_allocations(
  p_distribution_id UUID,
  p_source_amount_sat BIGINT
)
RETURNS TABLE(allocation_count INT, total_distributed_sat BIGINT) AS $$
DECLARE
  v_total_staked BIGINT;
  v_record RECORD;
  v_allocation_percentage NUMERIC;
  v_allocated_sat BIGINT;
  v_count INT := 0;
  v_distributed BIGINT := 0;
BEGIN
  -- Get total staked $NPGX across all active stakes (snapshot for this distribution)
  SELECT COALESCE(SUM(amount_npgx), 0)
  INTO v_total_staked
  FROM npgx_stakes
  WHERE status = 'active';

  IF v_total_staked = 0 THEN
    RETURN QUERY SELECT 0::INT, 0::BIGINT;
    RETURN;
  END IF;

  -- For each member with active stakes, allocate proportionally
  FOR v_record IN
    SELECT
      m.user_handle,
      m.bsv_address,
      COALESCE(SUM(s.amount_npgx), 0) as total_user_staked
    FROM npgx_members m
    LEFT JOIN npgx_stakes s ON m.user_handle = s.user_handle AND s.status = 'active'
    WHERE m.kyc_status = 'verified'
    GROUP BY m.user_handle, m.bsv_address
    HAVING COALESCE(SUM(s.amount_npgx), 0) > 0
  LOOP
    v_allocation_percentage := (v_record.total_user_staked::NUMERIC / v_total_staked::NUMERIC);
    v_allocated_sat := (p_source_amount_sat * v_allocation_percentage)::BIGINT;

    INSERT INTO npgx_dividend_allocations (
      distribution_id,
      user_handle,
      bsv_address,
      total_npgx_staked_at_snapshot,
      allocation_percentage,
      amount_allocated_sat,
      payment_status
    ) VALUES (
      p_distribution_id,
      v_record.user_handle,
      v_record.bsv_address,
      v_record.total_user_staked,
      v_allocation_percentage,
      v_allocated_sat,
      'pending'
    );

    v_count := v_count + 1;
    v_distributed := v_distributed + v_allocated_sat;
  END LOOP;

  RETURN QUERY SELECT v_count, v_distributed;
END;
$$ LANGUAGE plpgsql;

-- Mark allocations as paid (called after successful BSV distribution)
CREATE OR REPLACE FUNCTION mark_npgx_allocations_paid(
  p_distribution_id UUID,
  p_payment_txid TEXT
)
RETURNS TABLE(updated_count INT) AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE npgx_dividend_allocations
  SET
    payment_status = 'sent',
    payment_txid = p_payment_txid,
    payment_sent_at = NOW(),
    updated_at = NOW()
  WHERE distribution_id = p_distribution_id
    AND payment_status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

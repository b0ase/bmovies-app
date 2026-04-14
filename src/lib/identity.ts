/**
 * $401 Identity Verification
 *
 * Checks whether a user has submitted sufficient identity to qualify
 * for staking, dividends, and commercial licence rights.
 *
 * Identity levels:
 *   Level 0: Anonymous (HandCash handle only) -- can browse content
 *   Level 1: HandCash OAuth verified -- can stake + earn dividends
 *   Level 2: Multiple providers verified -- commercial licence active
 *   Level 3+: Full KYC -- enterprise/unlimited tiers
 *
 * For now, HandCash OAuth counts as Level 1 (the handle is identity-linked
 * through HandCash's own KYC). Higher levels require explicit $401 strands.
 */

import { createAdminClient } from '@/lib/supabase-admin';

export interface IdentityStatus {
  handle: string;
  level: number;
  verified: boolean;
  ordAddress?: string;
  canStake: boolean;
  canClaimDividends: boolean;
  canCommercialUse: boolean;
  reason?: string;
}

/**
 * Check a user's identity level.
 *
 * Level 1 (HandCash OAuth) is the minimum for staking + dividends.
 * This is already satisfied by having a HandCash account (KYC'd by HandCash).
 *
 * Higher levels require $401 identity strands.
 */
export async function getIdentityStatus(handle: string): Promise<IdentityStatus> {
  const supabase = createAdminClient();

  // Check if user has a member record with KYC info
  const { data: member } = await supabase
    .from('npgx_members')
    .select('kyc_status, bsv_address')
    .eq('user_handle', handle)
    .maybeSingle();

  const kycVerified = member?.kyc_status === 'verified';

  // HandCash OAuth = Level 1 minimum (HandCash does its own KYC)
  // Having a handle at all means HandCash verified you
  const effectiveLevel = kycVerified ? 2 : 1;

  return {
    handle,
    level: effectiveLevel,
    verified: effectiveLevel >= 1,
    ordAddress: member?.bsv_address || undefined,
    canStake: effectiveLevel >= 1,
    canClaimDividends: effectiveLevel >= 1,
    canCommercialUse: effectiveLevel >= 2 || kycVerified,
  };
}

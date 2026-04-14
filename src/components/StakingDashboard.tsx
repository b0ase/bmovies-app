'use client';

import { useState, useEffect } from 'react';

/**
 * Simple relative time formatter (no external dependency)
 */
function formatDistanceToNow(date: Date, opts?: { addSuffix?: boolean }): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  let result: string;
  if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    result = `${months} month${months > 1 ? 's' : ''}`;
  } else if (diffDays > 0) {
    result = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHr > 0) {
    result = `${diffHr} hour${diffHr > 1 ? 's' : ''}`;
  } else if (diffMin > 0) {
    result = `${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  } else {
    result = 'less than a minute';
  }

  return opts?.addSuffix ? `${result} ago` : result;
}

/**
 * StartVeriffButton - Initiates Veriff KYC session
 */
function StartVeriffButton({
  userHandle,
  onSuccess,
}: {
  userHandle: string;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const handleStartVeriff = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/staking/kyc/veriff/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_handle: userHandle, email }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start KYC');
      }

      const { verification_url, session_id } = await res.json();
      console.log(`[KYC] Started session ${session_id}`);

      // Redirect to Veriff
      window.location.href = verification_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start verification';
      setError(message);
      console.error('[StartVeriff] Error:', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Email (for notifications)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@example.com"
          className="w-full px-3 py-2 bg-black/50 border border-red-900/50 rounded text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">
          We&apos;ll send you email notifications for KYC decisions and dividend payments.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-400 rounded text-sm">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <button
        onClick={handleStartVeriff}
        disabled={loading || !email}
        className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-[family-name:var(--font-brand)] font-medium tracking-wider"
      >
        {loading ? 'STARTING VERIFICATION...' : 'START VERIFF VERIFICATION'}
      </button>
    </div>
  );
}

interface StakingData {
  user_handle: string;
  member: {
    id: string;
    kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    total_npgx_staked: number;
    active_stake_count: number;
    total_dividends_received_sat: number;
    bsv_address?: string;
  };
  stakes: Array<{
    id: string;
    amount_npgx: number;
    staking_address: string;
    status: 'active' | 'unstaking' | 'unstaked';
    staked_at: string;
    unstaked_at?: string;
  }>;
  pending_dividends_sat: number;
  pending_allocations_count: number;
}

export function StakingDashboard({ userHandle }: { userHandle: string }) {
  const [data, setData] = useState<StakingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingDividends, setClaimingDividends] = useState(false);

  useEffect(() => {
    async function fetchStakingData() {
      try {
        const res = await fetch(`/api/staking?user_handle=${encodeURIComponent(userHandle)}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch staking data: ${res.statusText}`);
        }
        const stakingData = await res.json();
        setData(stakingData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load staking data');
      } finally {
        setLoading(false);
      }
    }

    if (userHandle) {
      fetchStakingData();
    }
  }, [userHandle]);

  const handleClaimDividends = async () => {
    if (!data || !data.pending_dividends_sat) return;

    setClaimingDividends(true);
    try {
      const res = await fetch('/api/staking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_dividends',
          user_handle: userHandle,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to claim dividends');
      }

      const result = await res.json();
      alert(
        `Success! Claimed ${result.allocation_count} allocation(s) totaling ${result.pending_amount_sat} sats.`
      );

      // Refresh data
      const refreshRes = await fetch(`/api/staking?user_handle=${encodeURIComponent(userHandle)}`);
      const updatedData = await refreshRes.json();
      setData(updatedData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to claim dividends');
    } finally {
      setClaimingDividends(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading staking data...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-400">Error: {error}</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-400">No staking data found</div>;
  }

  const kycStatusColor = {
    unverified: 'bg-gray-800 text-gray-400 border-gray-700',
    pending: 'bg-yellow-950/50 text-yellow-400 border-yellow-800',
    verified: 'bg-green-950/50 text-green-400 border-green-800',
    rejected: 'bg-red-950/50 text-red-400 border-red-800',
  }[data.member.kyc_status];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-red-900/30 pb-4">
        <h1 className="text-3xl font-[family-name:var(--font-brand)] font-bold text-white tracking-wider">
          STAKING DASHBOARD
        </h1>
        <p className="text-gray-400 mt-1">@{data.user_handle}</p>
      </div>

      {/* KYC Status Card */}
      <div className="border border-red-900/30 rounded-lg p-4 bg-black/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white font-[family-name:var(--font-brand)] tracking-wide">
              KYC VERIFICATION STATUS
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Required to claim dividend payments and receive governance rights
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${kycStatusColor}`}>
            {data.member.kyc_status.charAt(0).toUpperCase() + data.member.kyc_status.slice(1)}
          </span>
        </div>

        {data.member.kyc_status !== 'verified' && (
          <StartVeriffButton userHandle={userHandle} onSuccess={() => window.location.reload()} />
        )}
      </div>

      {/* Staking Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-red-900/30 rounded-lg p-4 bg-black/30">
          <h4 className="text-gray-400 text-sm font-[family-name:var(--font-brand)] tracking-wide">
            TOTAL $NPGX STAKED
          </h4>
          <p className="text-3xl font-bold mt-2 text-white">{data.member.total_npgx_staked.toLocaleString()}</p>
          <p className="text-gray-500 text-sm mt-1">{data.member.active_stake_count} active stake(s)</p>
        </div>

        <div className="border border-red-900/30 rounded-lg p-4 bg-black/30">
          <h4 className="text-gray-400 text-sm font-[family-name:var(--font-brand)] tracking-wide">
            PENDING DIVIDENDS
          </h4>
          <p className="text-3xl font-bold mt-2 text-red-400">{data.pending_dividends_sat.toLocaleString()}</p>
          <p className="text-gray-500 text-sm mt-1">{data.pending_allocations_count} allocation(s)</p>
        </div>

        <div className="border border-red-900/30 rounded-lg p-4 bg-black/30">
          <h4 className="text-gray-400 text-sm font-[family-name:var(--font-brand)] tracking-wide">
            TOTAL RECEIVED
          </h4>
          <p className="text-3xl font-bold mt-2 text-green-400">
            {data.member.total_dividends_received_sat.toLocaleString()}
          </p>
          <p className="text-gray-500 text-sm mt-1">sats (lifetime)</p>
        </div>
      </div>

      {/* Claim Dividends */}
      {data.pending_dividends_sat > 0 && data.member.kyc_status === 'verified' && (
        <div className="border-l-4 border-green-500 bg-green-950/30 p-4 rounded">
          <h3 className="font-semibold text-green-300 font-[family-name:var(--font-brand)] tracking-wide">
            CLAIM AVAILABLE DIVIDENDS
          </h3>
          <p className="text-green-400/80 text-sm mt-1">
            You have {data.pending_allocations_count} pending allocation(s) totaling{' '}
            {data.pending_dividends_sat.toLocaleString()} sats ready to claim.
          </p>
          <button
            onClick={handleClaimDividends}
            disabled={claimingDividends}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-700 disabled:text-gray-500 font-[family-name:var(--font-brand)] tracking-wider"
          >
            {claimingDividends ? 'CLAIMING...' : 'CLAIM DIVIDENDS'}
          </button>
        </div>
      )}

      {data.pending_dividends_sat > 0 && data.member.kyc_status !== 'verified' && (
        <div className="border-l-4 border-yellow-500 bg-yellow-950/30 p-4 rounded">
          <h3 className="font-semibold text-yellow-300 font-[family-name:var(--font-brand)] tracking-wide">
            COMPLETE KYC TO CLAIM DIVIDENDS
          </h3>
          <p className="text-yellow-400/80 text-sm mt-1">
            You have {data.pending_allocations_count} allocation(s) waiting, but dividends can only be
            claimed after KYC verification.
          </p>
        </div>
      )}

      {/* Active Stakes */}
      <div className="border border-red-900/30 rounded-lg p-4 bg-black/30">
        <h3 className="font-semibold text-lg mb-4 text-white font-[family-name:var(--font-brand)] tracking-wide">
          ACTIVE STAKES
        </h3>
        {data.stakes.length === 0 ? (
          <p className="text-gray-500">No staking activity yet.</p>
        ) : (
          <div className="space-y-3">
            {data.stakes.map((stake) => (
              <div key={stake.id} className="flex items-center justify-between border-b border-gray-800 pb-3 last:border-b-0">
                <div>
                  <p className="font-medium text-white">{stake.amount_npgx.toLocaleString()} $NPGX</p>
                  <p className="text-gray-500 text-sm font-mono">
                    {stake.staking_address.slice(0, 20)}...{stake.staking_address.slice(-8)}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    {stake.status === 'active'
                      ? `Staked ${formatDistanceToNow(new Date(stake.staked_at), { addSuffix: true })}`
                      : stake.unstaked_at
                      ? `Unstaked ${formatDistanceToNow(new Date(stake.unstaked_at), { addSuffix: true })}`
                      : 'Unstaked'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium border ${
                    stake.status === 'active'
                      ? 'bg-green-950/50 text-green-400 border-green-800'
                      : 'bg-gray-900 text-gray-400 border-gray-700'
                  }`}
                >
                  {stake.status.charAt(0).toUpperCase() + stake.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-black/30 border border-red-900/20 rounded-lg p-4 text-sm text-gray-400">
        <p>
          <strong className="text-white">How it works:</strong> Stake your $NPGX to become eligible for dividend claims. Complete
          KYC verification to receive BSV dividend payments when distributions are made. Governance rights are
          tied to your verified identity.
        </p>
      </div>
    </div>
  );
}

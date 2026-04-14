'use client';

import { useState } from 'react';

interface DividendStatusViewerProps {
  onError?: (error: string) => void;
}

export function DividendStatusViewer({ onError }: DividendStatusViewerProps) {
  const [lookupId, setLookupId] = useState('');
  const [isDistributionId, setIsDistributionId] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [paymentTxId, setPaymentTxId] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const adminKey = prompt('Enter admin API key:');
      if (!adminKey) {
        onError?.('Admin key required');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/staking/dividends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'status',
          [isDistributionId ? 'distribution_id' : 'batch_id']: lookupId.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }

      const data = await res.json();
      setStatus(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!paymentTxId.trim()) {
      onError?.('Payment transaction ID is required');
      return;
    }

    if (!status?.distribution?.id) {
      onError?.('Distribution ID not found');
      return;
    }

    setExecuting(true);

    try {
      const adminKey = prompt('Enter admin API key (confirm):');
      if (!adminKey) {
        setExecuting(false);
        return;
      }

      const res = await fetch('/api/staking/dividends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'execute',
          distribution_id: status.distribution.id,
          payment_txid: paymentTxId.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to execute distribution');
      }

      const data = await res.json();
      alert(`Success! Marked ${data.updated_allocations} allocations as paid.`);
      setPaymentTxId('');

      // Refresh status
      const refreshRes = await fetch('/api/staking/dividends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'status',
          distribution_id: status.distribution.id,
        }),
      });

      if (refreshRes.ok) {
        const refreshedData = await refreshRes.json();
        setStatus(refreshedData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onError?.(message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lookup Form */}
      <form onSubmit={handleLookup} className="space-y-4">
        <div>
          <label className="block text-sm font-[family-name:var(--font-brand)] tracking-wide text-gray-300 mb-2">
            LOOKUP BY
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={isDistributionId}
                onChange={() => setIsDistributionId(true)}
                className="mr-2 accent-red-500"
              />
              <span className="text-gray-300">Distribution ID</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={!isDistributionId}
                onChange={() => setIsDistributionId(false)}
                className="mr-2 accent-red-500"
              />
              <span className="text-gray-300">Batch ID</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-[family-name:var(--font-brand)] tracking-wide text-gray-300 mb-2">
            {isDistributionId ? 'DISTRIBUTION ID' : 'BATCH ID'}
          </label>
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder={isDistributionId ? 'UUID' : 'e.g., dividend-2026-03-q1'}
            className="w-full px-4 py-2 bg-black/50 border border-red-900/50 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:bg-gray-700 disabled:text-gray-500 font-[family-name:var(--font-brand)] tracking-wider"
        >
          {loading ? 'LOADING...' : 'LOOKUP STATUS'}
        </button>
      </form>

      {/* Distribution Details */}
      {status && (
        <div className="space-y-6">
          <div className="border border-red-900/30 rounded-lg p-4 bg-black/30">
            <h3 className="font-[family-name:var(--font-brand)] tracking-wide text-white mb-4">
              DISTRIBUTION DETAILS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium">ID</p>
                <p className="text-gray-300 font-mono text-xs break-all">{status.distribution.id}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Batch ID</p>
                <p className="text-gray-300">{status.distribution.batch_id}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Status</p>
                <p className="text-white font-semibold">{status.distribution.status}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Batch Number</p>
                <p className="text-gray-300">#{status.distribution.batch_number}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Total Recipients</p>
                <p className="text-gray-300">{status.distribution.total_recipients} stakers</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Total Distributed</p>
                <p className="text-gray-300">{status.distribution.total_distributed_sat.toLocaleString()} sats</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Source Amount</p>
                <p className="text-gray-300">{status.distribution.source_amount_sat.toLocaleString()} sats</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Undistributed</p>
                <p className="text-gray-300">{status.distribution.undistributed_sat.toLocaleString()} sats</p>
              </div>
            </div>
          </div>

          {/* Execute Distribution */}
          {status.distribution.status === 'calculated' && (
            <div className="border border-yellow-800 rounded-lg p-4 bg-yellow-950/20">
              <h3 className="font-[family-name:var(--font-brand)] tracking-wide text-yellow-300 mb-3">
                MARK AS EXECUTED
              </h3>
              <p className="text-yellow-400/80 text-sm mb-4">
                After distributing BSV to all {status.allocation_count} staker addresses, enter the payment
                transaction ID to complete this distribution.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentTxId}
                  onChange={(e) => setPaymentTxId(e.target.value)}
                  placeholder="BSV transaction ID (txid)"
                  className="flex-1 px-4 py-2 bg-black/50 border border-yellow-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  onClick={handleExecute}
                  disabled={executing || !paymentTxId.trim()}
                  className="px-6 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 transition disabled:bg-gray-700 disabled:text-gray-500 font-[family-name:var(--font-brand)] tracking-wider"
                >
                  {executing ? 'EXECUTING...' : 'MARK EXECUTED'}
                </button>
              </div>
            </div>
          )}

          {status.distribution.status === 'executed' && (
            <div className="border border-green-800 rounded-lg p-4 bg-green-950/20">
              <h3 className="font-[family-name:var(--font-brand)] tracking-wide text-green-300">
                DISTRIBUTION COMPLETED
              </h3>
              <p className="text-green-400/80 text-sm mt-2">
                Executed at: {new Date(status.distribution.executed_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Allocations Table */}
          <div className="border border-red-900/30 rounded-lg overflow-hidden">
            <div className="bg-black/50 px-4 py-3 border-b border-red-900/30">
              <h3 className="font-[family-name:var(--font-brand)] tracking-wide text-white">
                ALLOCATIONS ({status.allocation_count})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/30 border-b border-red-900/20">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-400 font-[family-name:var(--font-brand)] text-xs tracking-wider">User Handle</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-[family-name:var(--font-brand)] text-xs tracking-wider">Amount (sats)</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-[family-name:var(--font-brand)] text-xs tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-[family-name:var(--font-brand)] text-xs tracking-wider">TX ID</th>
                  </tr>
                </thead>
                <tbody>
                  {status.allocations && status.allocations.length > 0 ? (
                    status.allocations.map((allocation: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-800/50 hover:bg-black/20">
                        <td className="px-4 py-2 text-gray-300">@{allocation.user_handle}</td>
                        <td className="px-4 py-2 text-gray-300 font-mono">
                          {allocation.amount_allocated_sat.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${
                              allocation.payment_status === 'pending'
                                ? 'bg-yellow-950/50 text-yellow-400 border-yellow-800'
                                : 'bg-green-950/50 text-green-400 border-green-800'
                            }`}
                          >
                            {allocation.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 font-mono text-xs truncate max-w-[200px]">
                          {allocation.payment_txid || '--'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-center text-gray-600">
                        No allocations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

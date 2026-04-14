'use client';

import { useState } from 'react';

interface DividendDistributionFormProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function DividendDistributionForm({ onSuccess, onError }: DividendDistributionFormProps) {
  const [batchId, setBatchId] = useState('');
  const [sourceAmountSat, setSourceAmountSat] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (!batchId.trim()) {
      onError?.('Batch ID is required');
      setLoading(false);
      return;
    }

    if (!sourceAmountSat || parseInt(sourceAmountSat) <= 0) {
      onError?.('Amount must be greater than 0');
      setLoading(false);
      return;
    }

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
          action: 'distribute',
          batch_id: batchId.trim(),
          source_amount_sat: parseInt(sourceAmountSat),
          source_reference: sourceReference.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create distribution');
      }

      const data = await res.json();
      setResult(data);
      onSuccess?.(
        `Distribution created! Allocated to ${data.allocation_count} stakers (${data.total_distributed_sat} sats)`
      );

      setBatchId('');
      setSourceAmountSat('');
      setSourceReference('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Batch ID */}
      <div>
        <label className="block text-sm font-[family-name:var(--font-brand)] tracking-wide text-gray-300 mb-2">
          BATCH ID
        </label>
        <input
          type="text"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          placeholder="e.g., dividend-2026-03-q1"
          className="w-full px-4 py-2 bg-black/50 border border-red-900/50 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          required
        />
        <p className="text-gray-600 text-xs mt-1">Human-readable identifier for this distribution batch</p>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-[family-name:var(--font-brand)] tracking-wide text-gray-300 mb-2">
          TOTAL AMOUNT (SATOSHIS)
        </label>
        <input
          type="number"
          value={sourceAmountSat}
          onChange={(e) => setSourceAmountSat(e.target.value)}
          placeholder="50000000"
          className="w-full px-4 py-2 bg-black/50 border border-red-900/50 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          required
          min="1"
        />
        <p className="text-gray-600 text-xs mt-1">
          Total BSV available for distribution (in satoshis, 1 BSV = 100,000,000 sat)
        </p>
      </div>

      {/* Source Reference */}
      <div>
        <label className="block text-sm font-[family-name:var(--font-brand)] tracking-wide text-gray-300 mb-2">
          SOURCE REFERENCE (OPTIONAL)
        </label>
        <input
          type="text"
          value={sourceReference}
          onChange={(e) => setSourceReference(e.target.value)}
          placeholder="e.g., content-revenue-mar-2026"
          className="w-full px-4 py-2 bg-black/50 border border-red-900/50 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <p className="text-gray-600 text-xs mt-1">Reference to the revenue source (for audit trail)</p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-red-600 text-white font-[family-name:var(--font-brand)] tracking-wider rounded-lg hover:bg-red-700 transition disabled:bg-gray-700 disabled:text-gray-500"
      >
        {loading ? 'CALCULATING...' : 'CALCULATE DISTRIBUTION'}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-6 p-4 bg-green-950/30 border border-green-800 rounded-lg">
          <h3 className="font-[family-name:var(--font-brand)] tracking-wide text-green-300 mb-3">
            DISTRIBUTION CALCULATED
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-green-400 font-medium">Distribution ID</p>
              <p className="text-gray-400 font-mono text-xs break-all">{result.distribution_id}</p>
            </div>
            <div>
              <p className="text-green-400 font-medium">Batch ID</p>
              <p className="text-gray-400">{result.batch_id}</p>
            </div>
            <div>
              <p className="text-green-400 font-medium">Recipients</p>
              <p className="text-gray-400">{result.allocation_count} stakers</p>
            </div>
            <div>
              <p className="text-green-400 font-medium">Amount Allocated</p>
              <p className="text-gray-400">{result.total_distributed_sat.toLocaleString()} sats</p>
            </div>
            <div>
              <p className="text-green-400 font-medium">Undistributed</p>
              <p className="text-gray-400">{result.undistributed_sat.toLocaleString()} sats (rounding)</p>
            </div>
            <div>
              <p className="text-green-400 font-medium">Message</p>
              <p className="text-gray-400">{result.message}</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-black/50 border border-red-900/30 rounded text-sm text-gray-400">
            <strong className="text-white">Next Step:</strong> After distributing BSV to staker addresses, use the &quot;View Status&quot;
            tab and enter this Distribution ID to mark allocations as paid.
          </div>
        </div>
      )}
    </form>
  );
}

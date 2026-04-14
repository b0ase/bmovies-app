'use client';

import { useState } from 'react';
import { DividendDistributionForm } from '@/components/DividendDistributionForm';
import { DividendStatusViewer } from '@/components/DividendStatusViewer';

export default function AdminDividendsPage() {
  const [activeTab, setActiveTab] = useState<'distribute' | 'status'>('distribute');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDistributionCreated = (message: string) => {
    setMessage({ type: 'success', text: message });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleError = (error: string) => {
    setMessage({ type: 'error', text: error });
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-[family-name:var(--font-brand)] font-bold text-white tracking-wider">
            DIVIDEND MANAGEMENT
          </h1>
          <p className="text-gray-400 mt-2">
            Calculate and execute dividend distributions to verified $NPGX stakers
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-950/30 text-green-400 border-green-800'
                : 'bg-red-950/30 text-red-400 border-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-red-900/30">
          <button
            onClick={() => setActiveTab('distribute')}
            className={`px-4 py-3 font-[family-name:var(--font-brand)] tracking-wider transition ${
              activeTab === 'distribute'
                ? 'border-b-2 border-red-500 text-red-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            CALCULATE DISTRIBUTION
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-3 font-[family-name:var(--font-brand)] tracking-wider transition ${
              activeTab === 'status'
                ? 'border-b-2 border-red-500 text-red-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            VIEW STATUS
          </button>
        </div>

        {/* Content */}
        <div className="bg-black/30 border border-red-900/30 rounded-lg shadow-lg p-8">
          {activeTab === 'distribute' && (
            <DividendDistributionForm
              onSuccess={handleDistributionCreated}
              onError={handleError}
            />
          )}
          {activeTab === 'status' && <DividendStatusViewer onError={handleError} />}
        </div>

        {/* Help */}
        <div className="mt-8 bg-black/30 border border-red-900/20 rounded-lg p-6">
          <h3 className="font-[family-name:var(--font-brand)] tracking-wide text-white mb-3">
            HOW DIVIDEND DISTRIBUTIONS WORK
          </h3>
          <ol className="space-y-2 text-gray-400 text-sm">
            <li>
              <strong className="text-gray-300">1. Calculate Distribution:</strong> Enter total revenue amount and batch
              details. The system calculates pro-rata allocations for all verified stakers based on
              their current $NPGX stakes.
            </li>
            <li>
              <strong className="text-gray-300">2. Review Allocations:</strong> Check the calculated amounts in the status
              view. The system shows allocation count and total distributed.
            </li>
            <li>
              <strong className="text-gray-300">3. Execute Distribution:</strong> After BSV has been sent to staker
              addresses, record the transaction ID to mark allocations as paid.
            </li>
            <li>
              <strong className="text-gray-300">4. Verify Claims:</strong> Users can then claim their dividends through the
              staking dashboard.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

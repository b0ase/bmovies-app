'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Service {
  id: string;
  name: string;
  category: string;
  current_plan: string;
  monthly_cost: number;
  is_active: boolean;
  is_critical: boolean;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
}

interface BurnRate {
  period_start: string;
  period_end: string;
  total_expenses: number;
  total_revenue: number;
  net_burn_rate: number;
  runway_months: number;
}

export default function ExpenseDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [burnRate, setBurnRate] = useState<BurnRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('monthly_cost', { ascending: false });

      // Fetch recent expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(10);

      // Fetch latest burn rate
      const { data: burnRateData } = await supabase
        .from('burn_rate_tracking')
        .select('*')
        .order('period_start', { ascending: false })
        .limit(1);

      setServices(servicesData || []);
      setExpenses(expensesData || []);
      setBurnRate(burnRateData?.[0] || null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalMonthlyCosts = services.reduce((sum, service) => sum + service.monthly_cost, 0);
  const criticalServices = services.filter(s => s.is_critical);
  const categoryCosts = services.reduce((acc, service) => {
    acc[service.category] = (acc[service.category] || 0) + service.monthly_cost;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/10 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8">💰 Financial Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Recurring</h3>
          <p className="text-3xl font-bold text-red-400">${totalMonthlyCosts.toFixed(2)}</p>
        </div>

        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Services</h3>
          <p className="text-3xl font-bold text-white">{services.length}</p>
        </div>

        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Critical Services</h3>
          <p className="text-3xl font-bold text-red-400">{criticalServices.length}</p>
        </div>

        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Runway</h3>
          <p className="text-3xl font-bold text-red-400">
            {burnRate?.runway_months || '∞'} months
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h2 className="text-xl font-semibold mb-4">💡 Costs by Category</h2>
          <div className="space-y-3">
            {Object.entries(categoryCosts)
              .sort(([,a], [,b]) => b - a)
              .map(([category, cost]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="capitalize text-gray-300">{category.replace('_', ' ')}</span>
                  <span className="font-semibold text-white">${cost.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h2 className="text-xl font-semibold mb-4">🚨 Critical Services</h2>
          <div className="space-y-3">
            {criticalServices.slice(0, 6).map(service => (
              <div key={service.id} className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-white">{service.name}</span>
                  <span className="text-sm text-gray-500 ml-2">{service.current_plan}</span>
                </div>
                <span className="font-semibold text-red-600">${service.monthly_cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white/5 rounded-lg border border-white/10 mb-8">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold">🛠️ All Active Services</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {services.map(service => (
                <tr key={service.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {service.is_critical && <span className="text-red-500 mr-2">🚨</span>}
                      <span className="font-medium text-white">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                    {service.category.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{service.current_plan}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    ${service.monthly_cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.is_active 
                        ? 'bg-red-600/20 text-red-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white/5 rounded-lg border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold">📊 Recent Expenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{expense.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                    {expense.category.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    ${expense.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      expense.is_recurring 
                        ? 'bg-red-600/20 text-gray-400' 
                        : 'bg-white/5 text-gray-200'
                    }`}>
                      {expense.is_recurring ? 'Recurring' : 'One-time'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!supabase && (
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-300">
            📝 Supabase not configured. Add your database credentials to see live financial data.
          </p>
        </div>
      )}
    </div>
  );
} 
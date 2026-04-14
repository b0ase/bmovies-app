'use client'

import { useState } from 'react'
import { 
  DocumentTextIcon, 
  EyeIcon, 
  PaperAirplaneIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface Invoice {
  id: string
  clientName: string
  clientEmail: string
  issueDate: string
  dueDate: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  subtotal: number
  tax: number
  total: number
  expenses: string[]
  description: string
  invoiceNumber: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      clientName: 'NPGX Client',
      clientEmail: 'ninjapunkgirlsx@gmail.com',
      issueDate: '2025-01-21',
      dueDate: '2025-02-05',
      status: 'sent',
      subtotal: 415,
      tax: 41.50,
      total: 456.50,
      expenses: ['Initial setup', 'Hero development', 'AI integrations'],
      description: 'NPGX platform development - Phase 1',
      invoiceNumber: 'INV-2025-001'
    },
    {
      id: '2',
      clientName: 'NPGX Client',
      clientEmail: 'ninjapunkgirlsx@gmail.com', 
      issueDate: '2025-01-15',
      dueDate: '2025-01-30',
      status: 'paid',
      subtotal: 300,
      tax: 30,
      total: 330,
      expenses: ['Project planning', 'Database setup'],
      description: 'NPGX platform - Initial consultation and setup',
      invoiceNumber: 'INV-2025-002'
    }
  ])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
  const paidInvoices = invoices.filter(inv => inv.status === 'paid')
  const pendingInvoices = invoices.filter(inv => inv.status === 'sent')
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue')

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-white/5 text-white',
      'sent': 'bg-white/10 text-gray-300',
      'paid': 'bg-red-600/20 text-red-300',
      'overdue': 'bg-red-500/20 text-red-300'
    }
    return colors[status as keyof typeof colors] || 'bg-white/5 text-white'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'sent':
        return <PaperAirplaneIcon className="h-4 w-4" />
      case 'overdue':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-transparent pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Client Invoices</h1>
          <p className="text-gray-400">Manage and track all client invoices for NPGX development</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">${totalRevenue}</div>
                <div className="text-sm text-gray-400">Total Revenue</div>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-300">{paidInvoices.length}</div>
                <div className="text-sm text-gray-400">Paid Invoices</div>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-400">{pendingInvoices.length}</div>
                <div className="text-sm text-gray-400">Pending</div>
              </div>
              <PaperAirplaneIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
                <div className="text-sm text-gray-400">Overdue</div>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Invoice</span>
          </button>
          <div className="flex space-x-4">
            <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors">
              Export Reports
            </button>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white/5 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-xl font-bold text-white">All Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/10">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-transparent">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{invoice.clientName}</div>
                        <div className="text-sm text-gray-500">{invoice.clientEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      <div className="max-w-xs truncate">{invoice.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      ${invoice.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1 capitalize">{invoice.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button className="text-gray-300 hover:text-green-900">
                          <PaperAirplaneIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Preview Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white/5 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-white">INVOICE</h2>
                    <p className="text-gray-400">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-500">NPGX</div>
                    <div className="text-sm text-gray-400">Development Services</div>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold text-white mb-2">Bill To:</h3>
                    <div className="text-gray-300">
                      <div className="font-medium">{selectedInvoice.clientName}</div>
                      <div>{selectedInvoice.clientEmail}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Invoice Details:</h3>
                    <div className="text-gray-300 space-y-1">
                      <div>Issue Date: {new Date(selectedInvoice.issueDate).toLocaleDateString()}</div>
                      <div>Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                      <div>Status: <span className="capitalize">{selectedInvoice.status}</span></div>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-8">
                  <h3 className="font-semibold text-white mb-4">Services Provided:</h3>
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-transparent">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white">Description</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-white">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        <tr>
                          <td className="px-4 py-3">
                            <div className="font-medium">{selectedInvoice.description}</div>
                            <div className="text-sm text-gray-400">
                              Includes: {selectedInvoice.expenses.join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">${selectedInvoice.subtotal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoice Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-b border-white/10">
                      <span>Subtotal:</span>
                      <span>${selectedInvoice.subtotal}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/10">
                      <span>Tax (10%):</span>
                      <span>${selectedInvoice.tax}</span>
                    </div>
                    <div className="flex justify-between py-3 font-bold text-lg border-b-2 border-gray-900">
                      <span>Total:</span>
                      <span>${selectedInvoice.total}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="text-sm text-gray-400 mb-8">
                  <h3 className="font-semibold text-white mb-2">Payment Terms:</h3>
                  <p>Payment is due within 15 days of invoice date. Late payments may incur additional fees.</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="px-6 py-2 border border-white/20 rounded-lg text-gray-300 hover:bg-transparent"
                  >
                    Close
                  </button>
                  <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Download PDF
                  </button>
                  <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Send Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
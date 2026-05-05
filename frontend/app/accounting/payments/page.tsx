'use client';

import { useState, useEffect } from 'react';
import { getStudentPayments } from '@/lib/api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    async function loadPayments() {
      try {
        const data = await getStudentPayments();
        setPayments(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Failed to load payments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, []);

  const filteredPayments = payments.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const totalDue = payments
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + p.amountDue, 0);

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountDue, 0);

  if (loading) return <div className="p-6">Loading payment information...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payment Slips</h1>
        <p className="text-gray-600">View your payment records and outstanding balance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Due"
          value={`$${totalDue.toFixed(2)}`}
          color="red"
        />
        <SummaryCard
          label="Total Paid"
          value={`$${totalPaid.toFixed(2)}`}
          color="green"
        />
        <SummaryCard
          label="Overdue Balance"
          value={`$${payments
            .filter((p) => p.status === 'overdue')
            .reduce((sum, p) => sum + p.amountDue, 0)
            .toFixed(2)}`}
          color="orange"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'paid', 'overdue'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No payment records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Semester</th>
                  <th className="text-center py-3 px-4 font-semibold">Amount Due</th>
                  <th className="text-left py-3 px-4 font-semibold">Currency</th>
                  <th className="text-left py-3 px-4 font-semibold">Due Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{payment.semester}</td>
                    <td className="text-center py-3 px-4 font-semibold">
                      {payment.amountDue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">{payment.currency}</td>
                    <td className="py-3 px-4">
                      {payment.dueDate
                        ? new Date(payment.dueDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
                        payment.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : payment.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      {payment.status !== 'paid' && (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Pay Now
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-800 font-medium ml-2">
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: 'red' | 'green' | 'orange' }) {
  const colorMap = {
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <p className="text-gray-600 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

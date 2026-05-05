'use client';

import { useEffect, useState } from 'react';
import { getAdminPayments, updatePaymentSlip } from '@/lib/api';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getAdminPayments()
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="sage-page-header">
        <div className="sage-page-title">Payments</div>
        <div className="sage-page-sub">Payment slips and status tracking</div>
      </div>
      <div className="sage-body">
        <div className="sage-card">
          {loading ? (
            <div className="loading-state">Loading payments...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Semester</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.paymentSlipId}>
                    <td>{payment.student?.name}</td>
                    <td>{payment.semester}</td>
                    <td>{payment.currency} {payment.amountDue}</td>
                    <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                    <td>{payment.status}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          await updatePaymentSlip(payment.paymentSlipId, { status: 'paid', paidDate: new Date().toISOString() });
                          load();
                        }}
                      >
                        Mark Paid
                      </button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">No payments found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

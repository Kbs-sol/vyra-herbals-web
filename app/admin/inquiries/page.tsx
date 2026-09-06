'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { supabase } from '@/utils/supabaseClient';

interface Inquiry {
    id: number;
    name: string;
    email: string;
    phone: string;
    comment: string;
    created_at: string;
}

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contact_inquiries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setInquiries(data || []);
        } catch (err) {
            console.error('Error fetching inquiries:', err);
            setError('Failed to load inquiries');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AdminLayoutWrapper pageTitle="Contact Inquiries">
            <div className="inquiries-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading inquiries...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>{error}</p>
                        <button onClick={fetchInquiries} className="retry-btn">Retry</button>
                    </div>
                ) : inquiries.length === 0 ? (
                    <div className="empty-state">
                        <p>No inquiries found.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="inquiries-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th className="message-col">Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inquiries.map((inquiry) => (
                                    <tr key={inquiry.id}>
                                        <td className="date-cell">{formatDate(inquiry.created_at)}</td>
                                        <td className="name-cell">{inquiry.name}</td>
                                        <td>
                                            <a href={`mailto:${inquiry.email}`} className="email-link">
                                                {inquiry.email}
                                            </a>
                                        </td>
                                        <td>
                                            {inquiry.phone ? (
                                                <a href={`tel:${inquiry.phone}`} className="phone-link">
                                                    {inquiry.phone}
                                                </a>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="message-cell">{inquiry.comment}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style jsx>{`
        .inquiries-container {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          min-height: 400px;
        }

        .loading-state, .error-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 16px;
          color: #6b7280;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .retry-btn {
          padding: 8px 16px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .table-container {
          overflow-x: auto;
        }

        .inquiries-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        th, td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
        }

        th {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          background: #f9fafb;
        }
        
        thead tr th:first-child {
            border-top-left-radius: 8px;
            border-bottom-left-radius: 8px;
        }
        thead tr th:last-child {
            border-top-right-radius: 8px;
            border-bottom-right-radius: 8px;
        }

        .date-cell {
          white-space: nowrap;
          color: #6b7280;
          font-size: 13px;
        }

        .name-cell {
          font-weight: 500;
          color: #1f2937;
        }

        .email-link, .phone-link {
          color: #10b981;
          text-decoration: none;
        }

        .email-link:hover, .phone-link:hover {
          text-decoration: underline;
        }

        .message-col {
          width: 40%;
        }

        .message-cell {
          color: #4b5563;
          line-height: 1.5;
        }
      `}</style>
        </AdminLayoutWrapper>
    );
}

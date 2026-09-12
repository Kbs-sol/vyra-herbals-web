'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { useRouter } from 'next/navigation';

export default function CustomerIntelligencePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'abandoned' | 'wishlist' | 'delivered' | 'registered' | 'leads'>('abandoned');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  
  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importStats, setImportStats] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: upload, 2: preview, 3: result

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [activeTab, debouncedSearch, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        search: debouncedSearch,
        page: currentPage.toString(),
        limit: '50'
      });
      const res = await fetch(`/api/admin/customer-intelligence?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.total || 0);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        search: debouncedSearch,
        format: 'csv'
      });
      window.open(`/api/admin/customer-intelligence?${params}`, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleSendCampaign = () => {
    router.push(`/admin/whatsapp?segment=${activeTab}`);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImportFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handlePreviewImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch('/api/admin/historical-leads/import?preview=true', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setImportPreview(json.preview);
        setImportStats(json.stats);
        setImportStep(2);
      } else {
        alert(json.error || 'Preview failed');
      }
    } catch (err) {
      alert('Error during preview');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch('/api/admin/historical-leads/import', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setImportStats(json.stats);
        setImportStep(3);
        if (activeTab === 'leads') fetchData();
      } else {
        alert(json.error || 'Import failed');
      }
    } catch (err) {
      alert('Error during import');
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreview([]);
    setImportStats(null);
    setImportStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderTableHead = () => {
    switch (activeTab) {
      case 'abandoned': return <tr><th>Phone</th><th>Cart Type</th><th>Cart Value / Items</th><th>Last Updated</th><th>Actions</th></tr>;
      case 'wishlist': return <tr><th>Name</th><th>Phone</th><th>Signup Date</th><th>Wishlist Items</th><th>Actions</th></tr>;
      case 'delivered': return <tr><th>Order ID</th><th>Name</th><th>Phone</th><th>Tracking / AWB</th><th>Delivery Date</th><th>Actions</th></tr>;
      case 'registered': return <tr><th>Name</th><th>Phone</th><th>Signup Date</th><th>Total Orders</th><th>LTV</th><th>Actions</th></tr>;
      case 'leads': return <tr><th>Name</th><th>Phone</th><th>Orders</th><th>Segment</th><th>Category</th><th>Import Date</th><th>Actions</th></tr>;
    }
  };

  const renderTableRow = (row: any, i: number) => {
    switch (activeTab) {
      case 'abandoned':
        return (
          <tr key={i}>
            <td>{row.phone}</td>
            <td>{row.type === 'abandoned' ? 'Registered User Cart' : 'Anonymous Cart'}</td>
            <td>{row.type === 'abandoned' ? `₹${row.cart_total}` : `${row.items?.length || 0} items`}</td>
            <td>{new Date(row.last_activity_at || row.last_updated).toLocaleString('en-IN')}</td>
            <td><button className="view-btn" onClick={() => setSelectedCustomer(row)}>View Details</button></td>
          </tr>
        );
      case 'wishlist':
        return (
          <tr key={i}>
            <td>{row.name}</td>
            <td>{row.phone}</td>
            <td>{new Date(row.signup_date).toLocaleDateString('en-IN')}</td>
            <td>{row.product_names?.join(', ') || '-'}</td>
            <td><button className="view-btn" onClick={() => setSelectedCustomer(row)}>View Details</button></td>
          </tr>
        );
      case 'delivered':
        return (
          <tr key={i}>
            <td>#{row.order_id}</td>
            <td>{row.name}</td>
            <td>{row.phone}</td>
            <td>{row.tracking_id || row.awb_code || '-'}</td>
            <td>{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
            <td><button className="view-btn" onClick={() => setSelectedCustomer(row)}>View Details</button></td>
          </tr>
        );
      case 'registered':
        return (
          <tr key={i}>
            <td>{row.name}</td>
            <td>{row.phone}</td>
            <td>{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
            <td>{row.order_count}</td>
            <td>₹{row.ltv}</td>
            <td><button className="view-btn" onClick={() => setSelectedCustomer(row)}>View Details</button></td>
          </tr>
        );
      case 'leads':
        return (
          <tr key={i}>
            <td>{row.full_name}</td>
            <td>{row.mobile_number}</td>
            <td>{row.total_orders}</td>
            <td><span className="tier-badge" style={{backgroundColor: '#e0f2fe', color: '#0284c7'}}>{row.segment}</span></td>
            <td>{row.primary_category || '-'}</td>
            <td>{new Date(row.imported_at).toLocaleDateString('en-IN')}</td>
            <td><button className="view-btn" onClick={() => setSelectedCustomer(row)}>View Details</button></td>
          </tr>
        );
    }
  };

  return (
    <AdminLayoutWrapper pageTitle="Customer Intelligence">
      <div className="customers-page">
        <div className="page-header">
          <div className="header-info">
            <h1 className="page-title">Customer Intelligence</h1>
            <p className="subtitle">{totalItems} results found</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'leads' && (
              <button onClick={() => setIsImportModalOpen(true)} className="export-btn" style={{ backgroundColor: '#3b82f6' }}>
                Import CSV
              </button>
            )}
            <button onClick={exportToCSV} className="export-btn">
              Export CSV
            </button>
            <button onClick={handleSendCampaign} className="export-btn" style={{ backgroundColor: '#1f2937' }}>
              Send Campaign
            </button>
          </div>
        </div>

        <div className="customer-tabs">
          {[
            { id: 'abandoned', label: 'Abandoned Carts' },
            { id: 'wishlist', label: 'Wishlist Leads' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'registered', label: 'Registered' },
            { id: 'leads', label: 'Past Buyers' },
          ].map(t => (
            <button
              key={t.id}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id as any); setCurrentPage(1); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="filters">
          <div className="search-form" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner"></div><p>Loading...</p></div>
          ) : data.length === 0 ? (
            <div className="empty-state"><p>No results found</p></div>
          ) : (
            <table>
              <thead>{renderTableHead()}</thead>
              <tbody>{data.map((row, i) => renderTableRow(row, i))}</tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="page-btn">Previous</button>
            <span className="page-info">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="page-btn">Next</button>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Customer Profile</h2>
              <button className="close-btn" onClick={() => setSelectedCustomer(null)}>×</button>
            </div>
            <div className="admin-modal-body" style={{ padding: '20px' }}>
              <div className="customer-profile">
                <div className="avatar large">
                  {(selectedCustomer.name || selectedCustomer.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                  <h3>{selectedCustomer.name || selectedCustomer.full_name || 'Unknown'}</h3>
                  <p>{selectedCustomer.phone || selectedCustomer.mobile_number}</p>
                </div>
              </div>
              <div className="detail-section" style={{ marginTop: '20px' }}>
                <h4>Details</h4>
                <pre style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px', overflowX: 'auto' }}>
                  {JSON.stringify(selectedCustomer, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="admin-modal-header">
              <h2>Import Historical Leads</h2>
              <button className="close-btn" onClick={closeImportModal}>×</button>
            </div>
            <div className="admin-modal-body" style={{ padding: '20px' }}>
              
              {importStep === 1 && (
                <div>
                  <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                    Upload a CSV file with historical buyer data. Expected columns:<br/>
                    <strong>full_name, mobile_number, total_orders, last_order_date, primary_category</strong>
                  </p>
                  
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    style={{
                      border: '2px dashed #d1d5db',
                      borderRadius: '8px',
                      padding: '40px',
                      textAlign: 'center',
                      background: '#f9fafb',
                      cursor: 'pointer'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      accept=".csv" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange}
                    />
                    {importFile ? (
                      <p><strong>Selected:</strong> {importFile.name}</p>
                    ) : (
                      <p>Drag & drop a CSV file here, or click to browse</p>
                    )}
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="tab" onClick={closeImportModal} style={{ padding: '8px 16px' }}>Cancel</button>
                    <button 
                      className="export-btn" 
                      disabled={!importFile || importing} 
                      onClick={handlePreviewImport}
                    >
                      {importing ? 'Processing...' : 'Preview Import'}
                    </button>
                  </div>
                </div>
              )}

              {importStep === 2 && (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', gap: '20px' }}>
                    <div className="stat-card" style={{ flex: 1, padding: '10px' }}>
                      <div className="stat-info">
                        <span className="stat-value">{importStats?.validToImport}</span>
                        <span className="stat-label">Valid Rows</span>
                      </div>
                    </div>
                    <div className="stat-card" style={{ flex: 1, padding: '10px' }}>
                      <div className="stat-info">
                        <span className="stat-value">{importStats?.invalidPhone}</span>
                        <span className="stat-label">Invalid Phone</span>
                      </div>
                    </div>
                    <div className="stat-card" style={{ flex: 1, padding: '10px' }}>
                      <div className="stat-info">
                        <span className="stat-value">{importStats?.skippedDuplicate}</span>
                        <span className="stat-label">Duplicates Skipped</span>
                      </div>
                    </div>
                  </div>

                  <h4>Preview (First 10 rows)</h4>
                  <div style={{ overflowX: 'auto', marginTop: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ minWidth: '100%' }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Segment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((r, i) => (
                          <tr key={i}>
                            <td>{r.full_name}</td>
                            <td>{r.mobile_number}</td>
                            <td>{r.segment}</td>
                            <td>
                              <span style={{ 
                                color: r.status === 'valid' ? '#10b981' : '#ef4444',
                                fontSize: '12px', fontWeight: 'bold'
                              }}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="tab" onClick={() => setImportStep(1)} style={{ padding: '8px 16px' }}>Back</button>
                    <button 
                      className="export-btn" 
                      disabled={importing || importStats?.validToImport === 0} 
                      onClick={handleConfirmImport}
                    >
                      {importing ? 'Importing...' : `Import ${importStats?.validToImport} Rows`}
                    </button>
                  </div>
                </div>
              )}

              {importStep === 3 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '30px' }}>
                    ✓
                  </div>
                  <h3>Import Successful!</h3>
                  <p style={{ marginTop: '10px', color: '#6b7280' }}>
                    Successfully imported <strong>{importStats?.imported}</strong> leads.
                  </p>
                  <button className="export-btn" onClick={closeImportModal} style={{ marginTop: '20px', margin: '20px auto 0' }}>
                    Done
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .customers-page { max-width: 1400px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .page-title { margin: 0; font-size: 24px; color: #111827; }
        .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
        .export-btn { display: flex; align-items: center; padding: 8px 16px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .export-btn:hover:not(:disabled) { opacity: 0.9; }
        .export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .customer-tabs { display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; overflow-x: auto; }
        .customer-tabs .tab { padding: 8px 16px; background: none; border: none; font-size: 14px; font-weight: 500; color: #6b7280; cursor: pointer; border-radius: 8px; transition: all 0.2s; white-space: nowrap; }
        .customer-tabs .tab:hover { background: #f3f4f6; color: #374151; }
        .customer-tabs .tab.active { background: #1f2937; color: white; }
        .filters { margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
        .search-form { display: flex; gap: 12px; flex: 1; min-width: 280px; }
        .search-input { flex: 1; display: flex; align-items: center; gap: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0 16px; }
        .search-input svg { color: #9ca3af; }
        .search-input input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: 14px; }
        .table-container { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 16px; text-align: left; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        th { background: #f9fafb; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
        .view-btn { background: none; border: none; color: #3b82f6; cursor: pointer; font-weight: 500; }
        .view-btn:hover { text-decoration: underline; }
        .loading, .empty-state { padding: 60px 20px; text-align: center; color: #6b7280; }
        .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; }
        .page-btn { padding: 8px 16px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 14px; color: #6b7280; }
        .tier-badge { padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .drawer-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 400px; background: white; box-shadow: -4px 0 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; z-index: 1001; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .admin-modal { background: white; border-radius: 16px; width: 90%; overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
        .admin-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e5e7eb; }
        .admin-modal-header h2 { margin: 0; font-size: 18px; color: #111827; }
        .close-btn { background: none; border: none; font-size: 24px; color: #6b7280; cursor: pointer; }
        .admin-modal-body { overflow-y: auto; flex: 1; }
        .customer-profile { display: flex; align-items: center; gap: 16px; }
        .avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; }
        .stat-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; display: flex; align-items: center; gap: 12px; }
        .stat-info .stat-value { font-size: 24px; font-weight: 700; color: #1f2937; }
        .stat-info .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
      `}</style>
    </AdminLayoutWrapper>
  );
}

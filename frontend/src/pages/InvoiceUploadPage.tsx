import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Plus, Trash2, Cpu, Eye } from 'lucide-react';
import api from '../services/api';

export const InvoiceUploadPage: React.FC = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedInvoiceId, setUploadedInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable OCR extracted fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 15 * 1024 * 1024) {
        setError('Selected file exceeds maximum allowable 15MB ceiling.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUploadAndOCR = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      setUploadedInvoiceId(data.invoice_id);
      const ocr = data.extracted_ocr;

      setInvoiceNumber(ocr.invoice_number || '');
      setInvoiceDate(ocr.invoice_date || '');
      setDueDate(ocr.due_date || '');
      setVendorName(ocr.vendor_name || 'Apex Cloud Systems Inc');
      setPoNumber(ocr.po_number || '');
      setGstin(ocr.gstin || '');
      setBankAccount(ocr.account_number || '');
      setSubtotal(ocr.subtotal_amount || 0);
      setTax(ocr.tax_amount || 0);
      setTotal(ocr.total_amount || 0);
      setItems(ocr.items || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Document upload and OCR extraction failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { item_description: 'New Extracted Service Item', quantity: 1, unit_price: 1000, tax_amount: 0, total_price: 1000 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      const q = Number(updated[index].quantity) || 0;
      const p = Number(updated[index].unit_price) || 0;
      updated[index].total_price = q * p;
    }
    setItems(updated);

    // Recalculate subtotal
    const newSubtotal = updated.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
    setSubtotal(newSubtotal);
    setTotal(newSubtotal + Number(tax));
  };

  const handleSubmitForVerification = async () => {
    if (!uploadedInvoiceId) return;
    setUploading(true);
    setError(null);

    try {
      // 1. Save any user corrections
      await api.put(`/invoices/${uploadedInvoiceId}/correct-ocr`, {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        subtotal_amount: subtotal,
        tax_amount: tax,
        total_amount: total,
        items: items.map(it => ({
          item_description: it.item_description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          tax_amount: Number(it.tax_amount || 0),
          total_price: Number(it.total_price)
        }))
      });

      // 2. Trigger automated deterministic rules & dual ML fraud detection
      await api.post(`/invoices/${uploadedInvoiceId}/verify`);

      // 3. Navigate to forensic deep dive
      navigate(`/invoices/${uploadedInvoiceId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Automated verification pipeline failed.');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Ingestion & OCR Review Studio</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload commercial invoices (PDF, PNG, JPG), review automated OCR extractions, and trigger forensic fraud screening
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start text-xs">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      {!uploadedInvoiceId && (
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-colors text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Upload Commercial Invoice Document</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Drag and drop your invoice here, or select a file from your workstation. Supported formats: PDF, PNG, JPG up to 15MB.
          </p>

          <label className="mt-4 inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs transition-colors">
            Browse Files
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {file && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-md mx-auto flex items-center justify-between text-xs">
              <div className="flex items-center text-slate-800 font-medium truncate">
                <FileText className="w-4 h-4 mr-2 text-indigo-600 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="text-slate-400 ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                type="button"
                onClick={handleUploadAndOCR}
                disabled={uploading}
                className="ml-3 px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-500 disabled:opacity-50"
              >
                {uploading ? 'Processing OCR...' : 'Run OCR Ingestion'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* OCR Human-in-the-Loop Review Form */}
      {uploadedInvoiceId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 2: Human-in-the-loop Review</span>
              <h3 className="text-lg font-bold text-slate-900">Verify & Correct Extracted Financial Data</h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              OCR Extracted
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Issue Date *</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Extracted Vendor Name *</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Linked Purchase Order #</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-APEX-001"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor GSTIN / Tax ID</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="29ABCDE1234F1Z5"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Disbursement Bank Account Number</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. 987654321098"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Disaggregated Line Items</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Line Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 w-20">Qty</th>
                    <th className="py-2.5 px-3 w-28">Unit Price ($)</th>
                    <th className="py-2.5 px-3 w-28">Total ($)</th>
                    <th className="py-2.5 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={it.item_description}
                          onChange={(e) => handleItemChange(idx, 'item_description', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-900 font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={it.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-900 font-mono"
                        />
                      </td>
                      <td className="p-2 font-mono font-semibold text-slate-900">
                        ${Number(it.total_price || 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount Totals */}
          <div className="flex justify-end pt-2 text-xs">
            <div className="w-64 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">${Number(subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax / GST:</span>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => {
                    const t = Number(e.target.value) || 0;
                    setTax(t);
                    setTotal(Number(subtotal) + t);
                  }}
                  className="w-24 text-right px-2 py-0.5 border border-slate-200 rounded font-mono"
                />
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="font-mono">${Number(total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submission Gate */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setUploadedInvoiceId(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel & Upload Another
            </button>

            <button
              type="button"
              onClick={handleSubmitForVerification}
              disabled={uploading}
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Cpu className="w-4 h-4 mr-2 animate-spin" />
                  Running ML & Fraud Verification...
                </>
              ) : (
                <>
                  Submit for Verification & Fraud Analysis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

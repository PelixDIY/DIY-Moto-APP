import React, { useEffect, useState } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense, uploadInvoiceImage } from '../services/db';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, isSameDay } from 'date-fns';
import { DollarSign, Upload, Download, Maximize2, X, Edit, Trash2, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { Timestamp } from 'firebase/firestore';

const ExpensesLog = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    // Filter State
    const [dateRange, setDateRange] = useState('thisMonth'); // today, thisWeek, thisMonth, allTime, custom
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Form State
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        category: 'Spare Parts',
        description: '',
        imageUrl: ''
    });
    const [imageFile, setImageFile] = useState(null);

    // Modal State
    const [selectedImage, setSelectedImage] = useState(null);

    const categories = ['Spare Parts', 'Tools', 'Office', 'Salary', 'Other'];

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const data = await getExpenses();
            setExpenses(data);
        } catch (error) {
            console.error("Error loading expenses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setFormData({
            date: format(getSafeDate(expense.date), 'yyyy-MM-dd'),
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
            imageUrl: expense.imageUrl || ''
        });
        setImageFile(null);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingExpense(null);
        setFormData({
            date: format(new Date(), 'yyyy-MM-dd'),
            amount: '',
            category: 'Spare Parts',
            description: '',
            imageUrl: ''
        });
        setImageFile(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            try {
                await deleteExpense(id);
                loadExpenses();
            } catch (error) {
                console.error("Error deleting expense:", error);
                alert("Failed to delete expense");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let imageUrl = formData.imageUrl;

            if (imageFile) {
                imageUrl = await uploadInvoiceImage(imageFile);
            }

            const expenseData = {
                ...formData,
                imageUrl,
                amount: parseFloat(formData.amount),
                date: new Date(formData.date).toISOString()
            };

            if (editingExpense) {
                await updateExpense(editingExpense.id, expenseData);
            } else {
                await addExpense(expenseData);
            }

            // Reset form
            handleCancelEdit();

            // Refresh list
            await loadExpenses();

        } catch (error) {
            console.error("Error saving expense:", error);
            alert(`Failed to save expense: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const getSafeDate = (timestamp) => {
        if (!timestamp) return new Date();
        if (timestamp.toDate) return timestamp.toDate();
        if (timestamp instanceof Date) return timestamp;
        return new Date(timestamp);
    };

    const handleDateRangeChange = (range) => {
        setDateRange(range);
        const today = new Date();

        switch (range) {
            case 'today':
                setStartDate(format(today, 'yyyy-MM-dd'));
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
            case 'thisWeek':
                setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
                setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
                break;
            case 'thisMonth':
                setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
                break;
            case 'allTime':
                setStartDate('2024-01-01'); // Start of 2024 or earlier
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
            case 'custom':
                // Keep current selection
                break;
            default:
                break;
        }
    };

    // Filter Logic
    const filteredExpenses = expenses.filter(expense => {
        const expenseDate = getSafeDate(expense.date);
        const dateStr = format(expenseDate, 'yyyy-MM-dd');
        return dateStr >= startDate && dateStr <= endDate;
    });

    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

    const downloadCSV = () => {
        if (filteredExpenses.length === 0) {
            alert("No expenses to export");
            return;
        }

        const headers = ["Date", "Category", "Description", "Amount", "Invoice URL"];
        const rows = filteredExpenses.map(item => {
            const date = getSafeDate(item.date);
            const safe = (str) => `"${String(str).replace(/"/g, '""')}"`;

            return [
                format(date, 'yyyy-MM-dd'),
                safe(item.category),
                safe(item.description),
                item.amount,
                safe(item.imageUrl || '')
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `expenses_log_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Expenses Log</h1>
                <button
                    onClick={downloadCSV}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <Download size={18} />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Input Form */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h3>
                    {editingExpense && (
                        <button
                            onClick={handleCancelEdit}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: '0.9rem'
                            }}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Date</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Category</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'white' }}
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Amount</label>
                        <input
                            type="number"
                            required
                            min="0"
                            placeholder="0"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Description</label>
                        <input
                            type="text"
                            required
                            placeholder="Item name / details"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Invoice Image</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="file"
                                id="file-upload"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <label
                                htmlFor="file-upload"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    justifyContent: 'center'
                                }}
                            >
                                <Upload size={16} />
                                {imageFile ? (imageFile.name.length > 20 ? imageFile.name.substring(0, 17) + '...' : imageFile.name) : 'Choose File'}
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            padding: '10px',
                            backgroundColor: editingExpense ? 'var(--color-info)' : 'var(--color-success)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                        }}
                    >
                        {submitting ? 'Saving...' : (editingExpense ? <><Edit size={16} /> Update Expense</> : <><DollarSign size={16} /> Add Expense</>)}
                    </button>
                </form>
            </div>

            {/* Stats & Filter */}
            <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '20px',
                backgroundColor: 'var(--color-bg-secondary)',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '6px', padding: '4px' }}>
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'thisWeek', label: 'This Week' },
                            { id: 'thisMonth', label: 'This Month' },
                            { id: 'allTime', label: 'All Time' },
                            { id: 'custom', label: 'Custom' }
                        ].map(option => (
                            <button
                                key={option.id}
                                onClick={() => handleDateRangeChange(option.id)}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    backgroundColor: dateRange === option.id ? 'var(--color-primary)' : 'transparent',
                                    color: dateRange === option.id ? 'white' : 'var(--color-text-secondary)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {dateRange === 'custom' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '10px' }}>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ padding: '6px 6px 6px 30px', borderRadius: '4px', backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'white', border: 'none' }}
                                />
                            </div>
                            <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ padding: '6px 6px 6px 30px', borderRadius: '4px', backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'white', border: 'none' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Expenses</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                        {formatCurrency(totalExpenses)}
                    </div>
                </div>
            </div>

            {/* List */}
            <div style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Date</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Category</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Description</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Invoice</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Amount</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : filteredExpenses.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}>No expenses found.</td></tr>
                        ) : (
                            filteredExpenses.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                    <td style={{ padding: '16px' }}>{format(getSafeDate(item.date), 'MMM dd, yyyy')}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        }}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>{item.description}</td>
                                    <td style={{ padding: '16px' }}>
                                        {item.imageUrl && (
                                            <div
                                                style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--color-border)' }}
                                                onClick={() => setSelectedImage(item.imageUrl)}
                                            >
                                                <img src={item.imageUrl} alt="Invoice" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.amount)}</td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                style={{ padding: '6px', backgroundColor: 'var(--color-bg-tertiary)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-info)' }}
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                style={{ padding: '6px', backgroundColor: 'var(--color-bg-tertiary)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-danger)' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '20px'
                }} onClick={() => setSelectedImage(null)}>
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                        <button
                            onClick={() => setSelectedImage(null)}
                            style={{
                                position: 'absolute', top: -40, right: 0,
                                background: 'none', border: 'none', color: 'white', cursor: 'pointer'
                            }}
                        >
                            <X size={24} />
                        </button>
                        <img src={selectedImage} alt="Full Invoice" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesLog;

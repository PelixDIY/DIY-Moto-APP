
import React, { useEffect, useState } from 'react';
import { getTransactions } from '../services/db';
import { format } from 'date-fns';
import { DollarSign, Search, Calendar, Download } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const SalesLog = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    // Default filter: 1st of current month to today
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const data = await getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error("Error loading sales log:", error);
        } finally {
            setLoading(false);
        }
    };

    const getSafeDate = (timestamp) => {
        if (!timestamp) return new Date();
        if (timestamp.toDate) return timestamp.toDate();
        if (timestamp instanceof Date) return timestamp;
        return new Date(timestamp);
    };



    // Filter Logic
    const filteredTransactions = transactions.filter(tx => {
        const txDate = getSafeDate(tx.date);
        // Normalize to YYYY-MM-DD for comparison
        const txDateStr = format(txDate, 'yyyy-MM-dd');
        return txDateStr >= startDate && txDateStr <= endDate;
    });

    // Unroll transactions for itemized display and export
    const unrolledItems = [];
    filteredTransactions.forEach(tx => {
        const date = getSafeDate(tx.date);
        const type = tx.type === 'service_payment' ? 'RENTAL' : 'SALE';
        const customer = tx.customer || tx.customerName || (tx.items && tx.items[0]?.name.includes('Bay') ? 'Walk-in / Rental' : 'Unknown');
        
        if (tx.items && tx.items.length > 0) {
            tx.items.forEach((item, idx) => {
                const qty = item.quantity || 1;
                const price = item.priceAtSale || 0;
                const cost = item.costPrice || 0;
                const totalAmount = qty * price;
                const totalCost = qty * cost;
                const margin = totalAmount - totalCost;

                unrolledItems.push({
                    id: `${tx.id}-${idx}`,
                    txId: tx.id,
                    date,
                    type,
                    customer,
                    orderNumber: tx.orderNumber || '-',
                    itemName: item.name,
                    quantity: qty,
                    priceAtSale: price,
                    costPrice: cost,
                    totalAmount,
                    totalCost,
                    margin
                });
            });
        } else {
            // Fallback for older transactions without items list
            unrolledItems.push({
                id: `${tx.id}-0`,
                txId: tx.id,
                date,
                type,
                customer,
                orderNumber: tx.orderNumber || '-',
                itemName: 'Legacy Grouped Items',
                quantity: 1,
                priceAtSale: tx.total || tx.total_amount || 0,
                costPrice: 0,
                totalAmount: tx.total || tx.total_amount || 0,
                totalCost: 0,
                margin: tx.total || tx.total_amount || 0
            });
        }
    });

    // Total Calculation
    const totalRevenue = unrolledItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalCostAll = unrolledItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalMarginAll = unrolledItems.reduce((sum, item) => sum + item.margin, 0);

    const downloadCSV = () => {
        if (unrolledItems.length === 0) {
            alert("No transactions to export");
            return;
        }

        const headers = ["Date", "Time", "Order Number", "Type", "Customer", "Item", "Quantity", "Unit Cost", "Unit Price", "Total Cost", "Total Amount", "Margin"];
        const rows = unrolledItems.map(item => {
            // Escape quotes and wrap in quotes for CSV safety
            const safe = (str) => `"${String(str).replace(/"/g, '""')}"`;

            return [
                format(item.date, 'yyyy-MM-dd'),
                format(item.date, 'HH:mm'),
                safe(item.orderNumber),
                safe(item.type),
                safe(item.customer),
                safe(item.itemName),
                item.quantity,
                item.costPrice,
                item.priceAtSale,
                item.totalCost,
                item.totalAmount,
                item.margin
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `sales_log_itemized_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Sales Log</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
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
                    <div style={{ padding: '8px 16px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={18} color="var(--color-text-secondary)" />
                        <span style={{ color: 'var(--color-text-secondary)' }}>All History</span>
                    </div>
                </div>
            </div>

            {/* Filter and Total Section */}
            <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '20px',
                backgroundColor: 'var(--color-bg-secondary)',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                alignItems: 'flex-end',
                flexWrap: 'wrap'
            }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)',
                            color: 'white'
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)',
                            color: 'white'
                        }}
                    />
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '30px', textAlign: 'right' }}>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Cost</div>
                        <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                            {formatCurrency(totalCostAll)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Margin</div>
                        <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                            {formatCurrency(totalMarginAll)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Revenue</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                            {formatCurrency(totalRevenue)}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Date & Time</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Order #</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Type</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Customer</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Item</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Qty</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Price</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Margin</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading transactions...</td>
                            </tr>
                        ) : unrolledItems.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No transactions found for selected period.</td>
                            </tr>
                        ) : (
                            filteredTransactions.map(tx => {
                                const date = getSafeDate(tx.date);
                                const type = tx.type === 'service_payment' ? 'RENTAL' : 'SALE';
                                const customer = tx.customer || tx.customerName || (tx.items && tx.items[0]?.name.includes('Bay') ? 'Walk-in / Rental' : 'Unknown');
                                const orderNumber = tx.orderNumber || '-';
                                
                                let txTotalAmount = 0;
                                let txMargin = 0;
                                const itemsDisplay = [];

                                if (tx.items && tx.items.length > 0) {
                                    tx.items.forEach((item, idx) => {
                                        const qty = item.quantity || 1;
                                        const price = item.priceAtSale || 0;
                                        const cost = item.costPrice || 0;
                                        const amount = qty * price;
                                        const margin = amount - (qty * cost);
                                        
                                        txTotalAmount += amount;
                                        txMargin += margin;

                                        itemsDisplay.push({
                                            id: `${tx.id}-${idx}`,
                                            itemName: item.name,
                                            quantity: qty,
                                            priceAtSale: price,
                                            margin,
                                            totalAmount: amount
                                        });
                                    });
                                } else {
                                    txTotalAmount = tx.total || tx.total_amount || 0;
                                    txMargin = tx.total || tx.total_amount || 0;
                                    itemsDisplay.push({
                                        id: `${tx.id}-0`,
                                        itemName: 'Legacy Grouped Items',
                                        quantity: 1,
                                        priceAtSale: txTotalAmount,
                                        margin: txMargin,
                                        totalAmount: txTotalAmount
                                    });
                                }

                                return (
                                    <React.Fragment key={tx.id}>
                                        <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ fontWeight: '500' }}>{format(date, 'MMM dd, yyyy')}</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{format(date, 'HH:mm')}</div>
                                            </td>
                                            <td style={{ padding: '16px', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                {orderNumber}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: type === 'RENTAL' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                                    color: type === 'RENTAL' ? 'var(--color-success)' : 'var(--color-info)'
                                                }}>
                                                    {type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {customer}
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                                                {itemsDisplay.length} item(s)
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}></td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}></td>
                                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', color: txMargin > 0 ? 'var(--color-success)' : 'inherit' }}>
                                                {formatCurrency(txMargin)}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                                {formatCurrency(txTotalAmount)}
                                            </td>
                                        </tr>
                                        {itemsDisplay.map((item, idx) => (
                                            <tr key={item.id} style={{ borderBottom: idx === itemsDisplay.length - 1 ? '2px solid var(--color-bg-tertiary)' : '1px solid var(--color-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                                <td colSpan="4" style={{ padding: 0 }}></td>
                                                <td style={{ padding: '12px 16px', paddingLeft: '32px', color: 'var(--color-text-secondary)' }}>
                                                    ↳ {item.itemName}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                    {item.quantity}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                                                    {formatCurrency(item.priceAtSale)}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: item.margin > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                                                    {formatCurrency(item.margin)}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                                                    {formatCurrency(item.totalAmount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesLog;

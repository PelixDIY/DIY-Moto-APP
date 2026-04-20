import React, { useEffect, useState } from 'react';
import { getOrders, getTransactions, getCustomers } from '../services/db';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const Reports = () => {
    const [rawData, setRawData] = useState({
        transactions: [],
        orders: [],
        customers: []
    });

    const [filterType, setFilterType] = useState('month'); 
    const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [topProductsData, setTopProductsData] = useState([]);
    const [mechanicData, setMechanicData] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const transactions = await getTransactions();
                const orders = await getOrders();
                const customers = await getCustomers();
                setRawData({ transactions, orders, customers });
            } catch (error) {
                console.error("Error loading report data:", error);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (!rawData.transactions.length && !rawData.orders.length) return;

        const now = new Date();
        let start, end;

        switch (filterType) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'week':
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'custom':
                start = startOfDay(parseISO(customStart));
                end = endOfDay(parseISO(customEnd));
                break;
            case 'all':
            default:
                start = null;
                end = null;
                break;
        }

        const isInRange = (dateObj) => {
            if (!start || !end) return true; // 'all'
            if (!dateObj) return false;
            const d = dateObj.toDate ? dateObj.toDate() : (dateObj instanceof Date ? dateObj : new Date(dateObj));
            return isWithinInterval(d, { start, end });
        };

        // 1. Process High-Margin Products
        const filteredTransactions = rawData.transactions.filter(t => isInRange(t.date));
        const productStats = {};

        filteredTransactions.forEach(t => {
            if (t.items && Array.isArray(t.items)) {
                t.items.forEach(item => {
                    const price = item.priceAtSale || 0;
                    const cost = item.costPrice || 0;
                    const profit = (price - cost) * (item.quantity || 1);
                    const name = item.name || 'Unknown';

                    if (!productStats[name]) {
                        productStats[name] = { name, revenue: 0, profit: 0, sold: 0 };
                    }
                    productStats[name].profit += profit;
                    productStats[name].revenue += price * (item.quantity || 1);
                    productStats[name].sold += (item.quantity || 1);
                });
            }
        });

        const sortedProducts = Object.values(productStats)
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10); // Top 10

        setTopProductsData(sortedProducts);

        // 2. Process Mechanic Performance
        // Using 'created_at' or 'updated_at' to filter orders in range. Let's use 'created_at'.
        const filteredOrders = rawData.orders.filter(o => isInRange(o.created_at) && o.status === 'paid');
        const mechanicStats = {};

        filteredOrders.forEach(o => {
            const mechanic = o.mechanic_id || 'Unassigned';
            const revenue = o.total_amount || 0;
            const cost = o.total_cost || 0;
            const profit = revenue - cost;

            if (!mechanicStats[mechanic]) {
                mechanicStats[mechanic] = { name: mechanic, jobs: 0, revenue: 0, profit: 0 };
            }
            mechanicStats[mechanic].jobs += 1;
            mechanicStats[mechanic].revenue += revenue;
            mechanicStats[mechanic].profit += profit;
        });

        const sortedMechanics = Object.values(mechanicStats).sort((a, b) => b.revenue - a.revenue);
        setMechanicData(sortedMechanics);

    }, [rawData, filterType, customStart, customEnd]);

    const filterBtnStyle = (type) => ({
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: filterType === type ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
        color: filterType === type ? 'white' : 'var(--color-text-secondary)',
        fontWeight: '500'
    });

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '0.9rem' }}>
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>Advanced Reporting</h1>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg-secondary)', padding: '6px', borderRadius: '8px' }}>
                    <button onClick={() => setFilterType('today')} style={filterBtnStyle('today')}>Today</button>
                    <button onClick={() => setFilterType('week')} style={filterBtnStyle('week')}>This Week</button>
                    <button onClick={() => setFilterType('month')} style={filterBtnStyle('month')}>This Month</button>
                    <button onClick={() => setFilterType('all')} style={filterBtnStyle('all')}>All Time</button>
                    <button onClick={() => setFilterType('custom')} style={filterBtnStyle('custom')}>Custom</button>
                </div>
            </div>

            {filterType === 'custom' && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginBottom: '20px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>From:</span>
                    <input
                        type="date"
                        value={customStart}
                        onChange={e => setCustomStart(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                    />
                    <span style={{ color: 'var(--color-text-secondary)' }}>To:</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={e => setCustomEnd(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                    />
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-xl)' }}>
                
                {/* Mechanic Performance Chart */}
                <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                    <h2 style={{ marginBottom: '8px' }}>Mechanic Performance (Revenue & Profit)</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>Analyzes 'Paid' orders within the selected time frame.</p>
                    
                    {mechanicData.length === 0 ? (
                        <div style={{ color: 'var(--color-text-muted)', padding: '40px 0', textAlign: 'center' }}>No mechanic data found for this period.</div>
                    ) : (
                        <div style={{ height: '400px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={mechanicData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{fill: 'var(--color-text-secondary)'}} />
                                    <YAxis yAxisId="left" stroke="var(--color-text-secondary)" tick={{fill: 'var(--color-text-secondary)'}} tickFormatter={(val) => `Rp ${val / 1000}k`} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="revenue" name="Total Revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="profit" name="Gross Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Top Margin Products Chart */}
                <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-xl)' }}>
                    <h2 style={{ marginBottom: '8px' }}>High-Margin Products & Services (Top 10)</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>Calculated from itemized transactions (Total Price - Cost Price).</p>
                    
                    {topProductsData.length === 0 ? (
                        <div style={{ color: 'var(--color-text-muted)', padding: '40px 0', textAlign: 'center' }}>No product sales data found for this period.</div>
                    ) : (
                        <div style={{ height: '400px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={topProductsData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="var(--color-text-secondary)" tickFormatter={(val) => `Rp ${val / 1000}k`} />
                                    <YAxis type="category" dataKey="name" stroke="var(--color-text-secondary)" width={150} tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                    <Legend />
                                    <Bar dataKey="profit" name="Total Profit" fill="#a855f7" radius={[0, 4, 4, 0]}>
                                        {
                                            topProductsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={'#a855f7'} />
                                            ))
                                        }
                                    </Bar>
                                    <Bar dataKey="revenue" name="Total Revenue" fill="var(--color-text-muted)" radius={[0, 4, 4, 0]} opacity={0.5} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Reports;

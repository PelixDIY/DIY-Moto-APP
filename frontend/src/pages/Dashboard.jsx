// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { getBookings, getProducts, getCustomers, getTransactions, getOrders } from '../services/db';
import { Calendar, DollarSign, Package, Users, ChevronRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/currency';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div style={{
        backgroundColor: 'var(--color-bg-secondary)',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
        <div style={{
            padding: '12px',
            borderRadius: '50%',
            backgroundColor: `rgba(${color}, 0.1)`,
            color: `rgb(${color})`
        }}>
            <Icon size={24} />
        </div>
        <div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{title}</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    // Stats for display
    const [stats, setStats] = useState({
        bookings: 0,
        revenue: 0,
        products: 0,
        customers: 0
    });

    // Valid data source
    const [rawData, setRawData] = useState({
        bookings: [],
        transactions: [],
        products: [],
        customers: [],
        orders: []
    });

    const navigate = useNavigate();

    // Filter State
    const [filterType, setFilterType] = useState('today'); // default to Today per request? Or 'all'? Let's do 'today' as requested "Dashboard also needs filtering Today..."
    // actually standard is usually 'today' or 'month'. Let's default to 'today' to show immediate activity.
    const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        async function fetchData() {
            try {
                const bookings = await getBookings();
                const products = await getProducts();
                const customers = await getCustomers();
                const transactions = await getTransactions();
                const orders = await getOrders();

                setRawData({ bookings, products, customers, transactions, orders });
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            }
        }
        fetchData();
    }, []);

    // Recalculate stats when filter or data changes
    useEffect(() => {
        if (!rawData.bookings.length && !rawData.transactions.length) return;

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
            // Handle Firestore Timestamp or Date object
            const d = dateObj.toDate ? dateObj.toDate() : (dateObj instanceof Date ? dateObj : new Date(dateObj));
            return isWithinInterval(d, { start, end });
        };

        // Filter Bookings
        const filteredBookings = rawData.bookings.filter(b => isInRange(b.startTime));

        // Filter Transactions (Revenue)
        const filteredTransactions = rawData.transactions.filter(t => isInRange(t.date));
        const totalRevenue = filteredTransactions.reduce((acc, curr) => acc + (Number(curr.total || curr.total_amount) || 0), 0);

        setStats({
            bookings: filteredBookings.length,
            revenue: totalRevenue,
            products: rawData.products.length, // Inventory usually constant unless we track 'added in period'
            customers: rawData.customers.length // Active customers usually total
        });

    }, [rawData, filterType, customStart, customEnd]);

    // RGB values from before
    const colors = {
        primary: '249, 115, 22',
        green: '34, 197, 94',
        blue: '6, 182, 212',
        purple: '168, 85, 247'
    };

    const filterBtnStyle = (type) => ({
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: filterType === type ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
        color: filterType === type ? 'white' : 'var(--color-text-secondary)',
        fontWeight: '500'
    });


    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>Dashboard Overview</h1>

                {/* Filter Controls */}
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

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-xl)'
            }}>
                <StatCard title="Total Bookings" value={stats.bookings} icon={Calendar} color={colors.primary} />
                <StatCard title="Total Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} color={colors.green} />
                <StatCard title="Inventory Items" value={stats.products} icon={Package} color={colors.blue} />
                <StatCard title="Active Customers" value={stats.customers} icon={Users} color={colors.purple} />
            </div>

            <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                    <Activity size={20} color="var(--color-primary)" /> Live Operations (Active Orders)
                </h3>
                {rawData.orders.filter(o => o.status !== 'completed' && o.status !== 'paid').length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', padding: '16px' }}>No active orders currently.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>Order Number</th>
                                <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>Customer</th>
                                <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>Status</th>
                                <th style={{ padding: '8px 12px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rawData.orders
                                .filter(o => o.status !== 'completed' && o.status !== 'paid')
                                .map(order => {
                                    const customerName = rawData.customers.find(c => c.id === order.client_id)?.name || 'Unknown';
                                    return (
                                        <tr key={order.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)', cursor: 'pointer' }} onClick={() => navigate(`/orders/${order.id}`)}>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{order.order_number}</td>
                                            <td style={{ padding: '12px' }}>{customerName}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                    backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-info)', textTransform: 'uppercase'
                                                }}>
                                                    {order.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <ChevronRight size={16} color="var(--color-text-muted)" />
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Recent Activity</h3>
                <p style={{ color: 'var(--color-text-muted)' }}>
                    Displaying activity for: <b>{filterType === 'all' ? 'All Time' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}</b>
                </p>
                {/* We could list filtered transactions here if needed, but keeping it simple as per original */}
            </div>
        </div>
    );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { getOrdersByBikeId, getOrderItemsByOrder } from '../../services/db';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';

const ServiceHistoryViewer = ({ bike, onClose }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!bike) return;
            setLoading(true);
            try {
                const historyOrders = await getOrdersByBikeId(bike.id);
                // Fetch items for each order
                const ordersWithItems = await Promise.all(historyOrders.map(async (order) => {
                    const items = await getOrderItemsByOrder(order.id);
                    return { ...order, items };
                }));
                // Filter only paid/completed orders? Or show all? Let's show all but mark their status.
                setOrders(ordersWithItems);
            } catch (error) {
                console.error("Error fetching service history:", error);
            }
            setLoading(false);
        };
        fetchHistory();
    }, [bike]);

    if (!bike) return null;

    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            <h2 style={{ marginBottom: '5px' }}>Service History</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', fontSize: '0.9rem' }}>
                Plate: <span style={{ color: 'white', fontWeight: 'bold' }}>{bike.plate_number || 'N/A'}</span>
            </p>

            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading history...</div>
            ) : orders.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                    No service records found for this motorcycle.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {orders.map(order => {
                        const date = order.created_at?.toDate ? format(order.created_at.toDate(), 'PPP p') : 'Unknown Date';
                        return (
                            <div key={order.id} style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--spacing-lg)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{date}</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}>Order #{order.order_number}</div>
                                        {order.mechanic_id && (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '4px' }}>Mechanic: {order.mechanic_id}</div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            backgroundColor: order.status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                            color: order.status === 'paid' ? '#4ade80' : '#facc15',
                                            marginBottom: '8px'
                                        }}>
                                            {order.status}
                                        </span>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(order.total_amount || 0)}</div>
                                    </div>
                                </div>

                                {order.problem_description && (
                                    <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                        <strong>Problem: </strong> {order.problem_description}
                                    </div>
                                )}

                                <div>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Items/Services:</strong>
                                    {order.items && order.items.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                                            {order.items.map(item => (
                                                <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', borderBottom: '1px dashed var(--color-border)' }}>
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(item.price * item.quantity)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>No items recorded.</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default ServiceHistoryViewer;

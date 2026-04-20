import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, updateOrder, getOrderItemsByOrder, getCustomers, removeOrderItem, createTransaction } from '../services/db';
// Need getDoc for bikes, or just create getBike in db.js if needed.
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatCurrency } from '../utils/currency';
import { ChevronLeft, Save, Plus, Trash2, Printer } from 'lucide-react';
import Button from '../components/common/Button';
import { printJobCard } from '../utils/printer';

import { updateClientBike } from '../services/db';

// Utility to get safe date
const getSafeDate = (timeField) => {
    if (!timeField) return null;
    if (timeField.toDate) return timeField.toDate();
    if (timeField instanceof Date) return timeField;
    return new Date(timeField);
};

const STATUS_FLOW = ["new", "diagnosing", "waiting_parts", "in_progress", "completed", "paid"];

const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [customer, setCustomer] = useState(null);
    const [bike, setBike] = useState(null);
    const [loading, setLoading] = useState(true);

    const [problemDesc, setProblemDesc] = useState('');
    const [mechanic, setMechanic] = useState('');
    const [mileage, setMileage] = useState('');
    const [status, setStatus] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const orderData = await getOrder(id);
            if (!orderData) {
                alert("Order not found");
                navigate('/orders');
                return;
            }
            setOrder(orderData);
            setProblemDesc(orderData.problem_description || '');
            setMechanic(orderData.mechanic_id || '');
            setMileage(orderData.mileage || '');
            setStatus(orderData.status || 'new');

            const itemsData = await getOrderItemsByOrder(id);
            setItems(itemsData);

            if (orderData.client_id) {
                const custDoc = await getDoc(doc(db, 'customers', orderData.client_id));
                if (custDoc.exists()) setCustomer(custDoc.data());
            }

            if (orderData.bike_id) {
                // Bikes are located in 'client_bikes' now
                const bikeDoc = await getDoc(doc(db, 'client_bikes', orderData.bike_id));
                if (bikeDoc.exists()) {
                    const bData = bikeDoc.data();
                    if (bData.bike_model_id) {
                        const modelDoc = await getDoc(doc(db, 'bike_models', bData.bike_model_id));
                        if (modelDoc.exists()) {
                            const mData = modelDoc.data();
                            bData.brand = mData.brand;
                            bData.model = mData.model;
                            bData.variant = mData.variant || '';
                        }
                    }
                    setBike(bData);
                } else {
                    // Fallback to legacy 'bikes' collection just in case
                    const oldBikeDoc = await getDoc(doc(db, 'bikes', orderData.bike_id));
                    if (oldBikeDoc.exists()) setBike(oldBikeDoc.data());
                }
            }

        } catch (error) {
            console.error("Failed to load order rules", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalCost = items.reduce((acc, item) => acc + ((item.costPrice || 0) * item.quantity), 0);
    const margin = totalAmount - totalCost;

    const handleSavePrimaryInfo = async () => {
        try {
            await updateOrder(id, {
                problem_description: problemDesc,
                mechanic_id: mechanic,
                mileage: mileage
            });

            // Sync mileage to the bike record
            if (order.bike_id && mileage) {
                await updateClientBike(order.bike_id, { last_mileage: mileage });
            }

            alert("Order updated successfully");
        } catch (e) {
            console.error(e);
            alert("Error saving");
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (status === newStatus) return;

        // Validation for moving to Paid
        if (newStatus === 'paid') {
            if (!order.client_id) {
                alert("Cannot mark as paid! A generic or active customer must be assigned.");
                return;
            }
            if (order.type !== 'self_service' && !mechanic) {
                alert("Cannot mark as paid! A mechanic must be assigned for Service orders.");
                return;
            }
            if (!bike) {
                alert("Cannot mark as paid! A bike must be allocated to this order.");
                return;
            }
            if (totalAmount === 0 && !window.confirm("Total amount is 0. Are you sure you want to mark this as paid?")) {
                return;
            }
        }

        try {
            let updates = { status: newStatus };
            let shouldLogSale = false;

            if (newStatus === 'paid' && !order.is_logged_to_sales) {
                updates.is_logged_to_sales = true;
                shouldLogSale = true;
            }

            await updateOrder(id, updates);
            setStatus(newStatus);
            setOrder(prev => ({ ...prev, ...updates }));
            
            if (shouldLogSale) {
                const transactionData = {
                    items: items.map(item => ({
                        productId: item.product_id || item.id,
                        name: item.name,
                        quantity: item.quantity,
                        priceAtSale: item.price,
                        costPrice: item.costPrice || 0
                    })),
                    total: totalAmount, // using closure
                    type: 'sale',
                    customerName: customer ? customer.name : 'Unknown',
                    orderNumber: order.order_number
                };
                await createTransaction(transactionData);
                alert("Order marked as Paid and logged to Sales Log!");
            }
        } catch (error) {
            console.error(error);
            alert("Error updating status");
        }
    };

    const handleRemoveItem = async (itemId, itemPrice) => {
        if(!window.confirm("Remove this item? Stock will be automatically restocked.")) return;
        try {
            await removeOrderItem(itemId);
            // Recalculate totals client side
            const newItems = items.filter(i => i.id !== itemId);
            const newAmount = newItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
            const newCost = newItems.reduce((acc, curr) => acc + ((curr.costPrice || 0) * curr.quantity), 0);

            await updateOrder(id, { total_amount: newAmount, total_cost: newCost });
            fetchData();
        } catch(e) {
            console.error(e);
            alert("Failed to remove item");
        }
    }

    if (loading) return <div>Loading order...</div>;
    if (!order) return <div>Order not found</div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                <Button variant="secondary" onClick={() => navigate('/orders')} style={{ padding: '8px' }}>
                    <ChevronLeft size={20} />
                </Button>
                <h1 style={{ fontSize: '1.875rem', margin: 0 }}>{order.order_number}</h1>
                <span style={{
                    marginLeft: '8px', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold',
                    backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-primary)'
                }}>
                    {order.type?.replace('_', ' ').toUpperCase()}
                </span>
                
                <div style={{ marginLeft: 'auto' }}>
                    <Button variant="secondary" onClick={() => printJobCard(order, customer, bike, items, totalAmount)}>
                        <Printer size={18} style={{ marginRight: '8px' }} /> Print Order
                    </Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--spacing-lg)' }}>
                {/* Main Left Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    
                    {/* Header Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Customer</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{customer ? customer.name : 'Unknown'}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{customer?.phone}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Bike Details</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{bike ? `${bike.brand} ${bike.model}` : 'Unknown'}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{bike?.plate_number}</div>
                        </div>
                    </div>

                    {/* Problem Description & Mechanic */}
                    <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Order Info</h3>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Problem Description</label>
                            <textarea 
                                value={problemDesc}
                                onChange={(e) => setProblemDesc(e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-bg-tertiary)', border: 'none', color: '#fff', borderRadius: '8px', minHeight: '80px' }}
                                placeholder="Describe the issue..."
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Mechanic</label>
                            <input 
                                value={mechanic}
                                onChange={(e) => setMechanic(e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-bg-tertiary)', border: 'none', color: '#fff', borderRadius: '8px' }}
                                placeholder="Assigned mechanic name"
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Current Mileage (km)</label>
                            <input 
                                type="number"
                                value={mileage}
                                onChange={(e) => setMileage(e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-bg-tertiary)', border: 'none', color: '#fff', borderRadius: '8px' }}
                                placeholder="e.g., 15000"
                            />
                        </div>
                        <Button onClick={handleSavePrimaryInfo}><Save size={18} style={{ marginRight: '8px'}} /> Save Details</Button>
                    </div>

                    {/* Items Table */}
                    <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Order Items</h3>
                            <Button variant="secondary" onClick={() => navigate('/pos?attachToOrder=' + id)}>
                                <Plus size={18} style={{ marginRight: '4px'}} /> Add Parts in POS
                            </Button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                    <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Type</th>
                                    <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Name</th>
                                    <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Qty</th>
                                    <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Price</th>
                                    <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Total</th>
                                    <th style={{ padding: '8px 0' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '16px 0', color: 'var(--color-text-muted)' }}>No items attached.</td></tr>
                                ) : items.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                        <td style={{ padding: '12px 0' }}>{item.type}</td>
                                        <td style={{ padding: '12px 0', fontWeight: '500' }}>{item.name}</td>
                                        <td style={{ padding: '12px 0' }}>{item.quantity}</td>
                                        <td style={{ padding: '12px 0' }}>{formatCurrency(item.price)}</td>
                                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{formatCurrency(item.price * item.quantity)}</td>
                                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                            <button onClick={() => handleRemoveItem(item.id, item.price)} style={{ background: 'none', border:'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Right Content (Status & Summary) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    
                    {/* Status Flow */}
                    <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Status Tracker</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {STATUS_FLOW.map((s, index) => {
                                const currentIndex = STATUS_FLOW.indexOf(status);
                                const isPassed = index <= currentIndex;
                                const isCurrent = s === status;
                                return (
                                    <div key={s} 
                                        onClick={() => handleStatusChange(s)}
                                        style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px',
                                        backgroundColor: isCurrent ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                        cursor: 'pointer',
                                        border: isCurrent ? '1px solid var(--color-primary)' : '1px solid transparent',
                                        opacity: isPassed ? 1 : 0.5
                                    }}>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            backgroundColor: isPassed ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {isCurrent && <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '50%' }} />}
                                        </div>
                                        <span style={{ textTransform: 'capitalize', fontWeight: isCurrent ? 'bold' : 'normal', color: isPassed ? '#fff' : 'var(--color-text-secondary)' }}>
                                            {s.replace('_', ' ')}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Financials</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Total Cost</span>
                            <span style={{ fontFamily: 'monospace' }}>{formatCurrency(totalCost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Margin</span>
                            <span style={{ fontFamily: 'monospace', color: 'var(--color-success)' }}>{formatCurrency(margin)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '12px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem' }}>
                            <span>Total Amount</span>
                            <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;

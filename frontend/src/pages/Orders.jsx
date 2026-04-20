// src/pages/Orders.jsx
import React, { useEffect, useState } from 'react';
import { getOrders, getCustomers, addCustomer, getBikesByCustomer, addBike, createOrder, getBikeModels, getAllClientBikes } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, Plus } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { format } from 'date-fns';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import BikeSelector from '../components/common/BikeSelector';
import { Timestamp } from 'firebase/firestore';

const CreateOrderModal = ({ onClose, onSuccess }) => {
    const [customers, setCustomers] = useState([]);
    const [models, setModels] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Customer
    const [isNew, setIsNew] = useState(false);
    const [newCust, setNewCust] = useState({ name: '', phone: '' });

    // Bike
    const [bikes, setBikes] = useState([]);
    const [selectedBikeId, setSelectedBikeId] = useState('');
    const [isNewBike, setIsNewBike] = useState(true);
    const [newBike, setNewBike] = useState({ bike_model_id: '', plate_number: '' });

    // Order Info
    const [serviceType, setServiceType] = useState('service');
    const [problemDesc, setProblemDesc] = useState('');

    useEffect(() => {
        Promise.all([getCustomers(), getBikeModels()]).then(([c, m]) => {
            setCustomers(c);
            setModels(m);
        }).catch(err => console.error("Failed to load initial data", err));
    }, []);

    useEffect(() => {
        if (!isNew && selectedCustomerId) {
            getBikesByCustomer(selectedCustomerId).then(data => {
                setBikes(data);
                if (data.length > 0) {
                    setIsNewBike(false);
                    setSelectedBikeId(data[0].id);
                } else {
                    setIsNewBike(true);
                    setSelectedBikeId('');
                }
            }).catch(console.error);
        } else {
            setBikes([]);
            setIsNewBike(true);
        }
    }, [isNew, selectedCustomerId]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let customerId = selectedCustomerId;
            if (isNew) {
                if (!newCust.name) return alert("Customer name required");
                const custRef = await addCustomer({ name: newCust.name, phone: newCust.phone });
                customerId = custRef.id;
            } else {
                if (!customerId) return alert("Select a customer");
            }

            let bikeId = selectedBikeId;
            if (isNewBike && (newBike.bike_model_id || newBike.plate_number)) {
                const bikeRef = await addBike({ ...newBike, client_id: customerId });
                bikeId = bikeRef.id;
            }

            const payload = {
                type: serviceType,
                client_id: customerId,
            };

            if (bikeId) payload.bike_id = bikeId;
            if (problemDesc) payload.problem_description = problemDesc;

            await createOrder(payload);

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '95%',
                border: '1px solid var(--color-border)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h3 style={{ marginBottom: '16px' }}>Create New Order</h3>

                {/* Customer Section */}
                <div style={{ marginBottom: '20px', padding: '12px', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>Customer Details</h4>
                    {!isNew ? (
                        <div>
                            <select
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', color: '#fff' }}
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                            >
                                <option value="">-- Choose Customer --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setIsNew(true)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', marginTop: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>+ New Customer</button>
                        </div>
                    ) : (
                        <div>
                            <Input label="Customer Name*" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} />
                            <Input label="Phone" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
                            <button type="button" onClick={() => setIsNew(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', marginTop: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel New Customer</button>
                        </div>
                    )}
                </div>

                {/* Bike Section */}
                <div style={{ marginBottom: '20px', padding: '12px', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--color-info)' }}>Bike Details</h4>
                    {!isNewBike && bikes.length > 0 ? (
                        <div>
                            <select
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--color-bg-tertiary)', color: '#fff' }}
                                value={selectedBikeId}
                                onChange={(e) => setSelectedBikeId(e.target.value)}
                            >
                                <option value="">-- Choose Bike --</option>
                                {bikes.map(b => {
                                    const model = models.find(m => m.id === b.bike_model_id);
                                    const title = model ? `${model.brand} ${model.model} ${model.variant || ''}` : (b.brand ? `${b.brand} ${b.model}` : 'Unknown Bike');
                                    return <option key={b.id} value={b.id}>{title} ({b.plate_number || 'No Plate'})</option>;
                                })}
                            </select>
                            <button type="button" onClick={() => setIsNewBike(true)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', marginTop: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>+ New Bike</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ zIndex: 10 }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Bike Model *</label>
                                <BikeSelector 
                                    value={newBike.bike_model_id} 
                                    onChange={(id) => setNewBike({...newBike, bike_model_id: id})} 
                                />
                            </div>
                            <div>
                                <Input label="Plate Number" value={newBike.plate_number} onChange={e => setNewBike({...newBike, plate_number: e.target.value})} />
                            </div>
                            {(!isNew && bikes.length > 0) && (
                                <button type="button" onClick={() => setIsNewBike(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', marginTop: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel New Bike</button>
                            )}
                        </div>
                    )}
                </div>

                {/* Service Info */}
                <div style={{ marginBottom: '20px', padding: '12px', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--color-success)' }}>Service Details</h4>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="radio" value="service" checked={serviceType === 'service'} onChange={(e) => setServiceType(e.target.value)} />
                            With Mechanic
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="radio" value="self_service" checked={serviceType === 'self_service'} onChange={(e) => setServiceType(e.target.value)} />
                            Self-Service
                        </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Problem Description (Optional)</label>
                        <textarea 
                            value={problemDesc}
                            onChange={(e) => setProblemDesc(e.target.value)}
                            style={{ 
                                width: '100%', padding: '10px', borderRadius: '6px', 
                                backgroundColor: 'var(--color-bg-tertiary)', color: '#fff', border: 'none', minHeight: '80px',
                                resize: 'vertical'
                            }}
                            placeholder="Describe what needs to be fixed..."
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Order'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState({});
    const [bikes, setBikes] = useState({});
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const navigate = useNavigate();

    const fetchOrdersData = async () => {
        setLoading(true);
        try {
            const [ordersData, customersData, bikesData, modelsData] = await Promise.all([
                getOrders(),
                getCustomers(),
                getAllClientBikes(),
                getBikeModels()
            ]);

            // Map customers for quick lookup
            const custMap = {};
            customersData.forEach(c => {
                custMap[c.id] = c.name;
            });
            setCustomers(custMap);

            const bikeMap = {};
            bikesData.forEach(b => {
                const m = modelsData.find(x => x.id === b.bike_model_id);
                const name = m ? `${m.brand} ${m.model}`.trim() : (b.brand ? `${b.brand} ${b.model}`.trim() : 'Unknown');
                bikeMap[b.id] = b.plate_number ? `${name} (${b.plate_number})` : name;
            });
            setBikes(bikeMap);

            setOrders(ordersData);
        } catch (error) {
            console.error("Failed to load orders", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrdersData();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'new': return 'var(--color-info)';
            case 'diagnosing': return '#8b5cf6'; // purple
            case 'waiting_parts': return 'var(--color-warning)';
            case 'in_progress': return 'var(--color-primary)';
            case 'ready': return 'var(--color-success)';
            case 'completed': return '#10b981'; // emerald
            case 'paid': return 'var(--color-text-muted)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const getSafeDate = (timeField) => {
        if (!timeField) return null;
        if (timeField.toDate) return timeField.toDate();
        if (timeField instanceof Date) return timeField;
        return new Date(timeField);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h1 style={{ fontSize: '1.875rem' }}>Orders (Job Cards)</h1>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} style={{ marginRight: '8px' }} />
                    Create New Order
                </Button>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Order Number</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Date</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Customer</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Bike</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Type</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Status</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Total</th>
                            <th style={{ padding: 'var(--spacing-md)' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="8" style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    Loading orders...
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No orders found.
                                </td>
                            </tr>
                        ) : (
                            orders.map(order => {
                                const date = getSafeDate(order.created_at);
                                return (
                                    <tr key={order.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        onClick={() => navigate(`/orders/${order.id}`)}>
                                        <td style={{ padding: 'var(--spacing-md)', fontWeight: 'bold' }}>{order.order_number}</td>
                                        <td style={{ padding: 'var(--spacing-md)' }}>{date ? format(date, 'MMM dd, yyyy HH:mm') : '-'}</td>
                                        <td style={{ padding: 'var(--spacing-md)' }}>{customers[order.client_id] || 'Unknown'}</td>
                                        <td style={{ padding: 'var(--spacing-md)' }}>
                                            {order.bike_id ? (bikes[order.bike_id] || 'Legacy Bike') : '-'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', textTransform: 'capitalize' }}>{order.type?.replace('_', ' ') || 'Unknown'}</td>
                                        <td style={{ padding: 'var(--spacing-md)' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                backgroundColor: `${getStatusColor(order.status)}33`,
                                                color: getStatusColor(order.status),
                                                textTransform: 'uppercase'
                                            }}>
                                                {order.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', fontWeight: 'bold' }}>{formatCurrency(order.total_amount)}</td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'right' }}>
                                            <ChevronRight size={20} color="var(--color-text-muted)" />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {showCreateModal && (
                <CreateOrderModal 
                    onClose={() => setShowCreateModal(false)} 
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchOrdersData();
                    }}
                />
            )}
        </div>
    );
};

export default Orders;

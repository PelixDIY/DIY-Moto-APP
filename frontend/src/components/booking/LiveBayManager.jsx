
import React, { useState, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { BAYS, getBays, startLiveSession, stopLiveSession, getCustomers, addCustomer, getProducts, addItemsToBooking, getBikeModels } from '../../services/db';
import { printStartSessionReceipt } from '../../utils/printer';
import Button from '../common/Button';
import Input from '../common/Input';
import { Timer, Play, CreditCard, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import BikeSelector from '../common/BikeSelector';

// Error Boundary for safety
class LiveBayErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("LiveBayManager Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <div style={{ padding: '20px', color: 'red', border: '1px solid red' }}>Something went wrong loading the live dashboard. Please refresh.</div>;
        }
        return this.props.children;
    }
}

const getSafeDate = (timeField) => {
    if (!timeField) return null;
    try {
        if (timeField.toDate) return timeField.toDate();
        if (timeField instanceof Date) return timeField;
        if (typeof timeField === 'number') return new Date(timeField);
        if (typeof timeField === 'string') return new Date(timeField);
        if (timeField.seconds) return new Date(timeField.seconds * 1000);
    } catch (e) {
        console.error("Date parsing error", timeField, e);
        return null;
    }
    return null;
}

const LiveBayManagerContent = ({ bookings = [], onUpdate }) => {
    // bookings passed here should be ALL 'active' bookings or we filter them
    const activeBookings = (bookings || []).filter(b => b.status === 'active');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [bays, setBays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        async function loadBays() {
            try {
                const data = await getBays();
                setBays(data);
            } catch (err) {
                console.error("Failed to load bays", err);
            } finally {
                setLoading(false);
            }
        }
        loadBays();
    }, []);

    if (loading) return <div>Loading config...</div>;

    return (
        <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>Live Station Management</h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                {bays.map(bay => {
                    const activeBooking = activeBookings.find(b => b.bayId === bay.id);
                    return (
                        <BayCard
                            key={bay.id}
                            bayId={bay.id}
                            bay={bay}
                            activeBooking={activeBooking}
                            currentTime={currentTime}
                            onUpdate={onUpdate}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const LiveBayManager = (props) => (
    <LiveBayErrorBoundary>
        <LiveBayManagerContent {...props} />
    </LiveBayErrorBoundary>
);

const BayCard = ({ bayId, bay, activeBooking, currentTime, onUpdate }) => {
    const isOccupied = !!activeBooking;
    const [elapsed, setElapsed] = useState('--:--');
    const [cost, setCost] = useState(0);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (activeBooking && activeBooking.startTime) {
            const start = getSafeDate(activeBooking.startTime);

            if (start && !isNaN(start.getTime())) {
                const diffMs = currentTime - start;
                const validDiff = Math.max(0, diffMs);

                const diffHrs = Math.floor(validDiff / (1000 * 60 * 60));
                const diffMins = Math.floor((validDiff % (1000 * 60 * 60)) / (1000 * 60));

                setElapsed(`${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}`);

                const totalHours = Math.ceil(validDiff / (1000 * 60 * 60));
                const billingHours = Math.max(1, totalHours);
                setCost(billingHours * (bay?.rate || 150000));
            } else {
                setElapsed('--:--');
            }
        }
    }, [activeBooking, currentTime, bay]);

    const handleStop = async () => {
        if (!confirm('Finish session and proceed to payment?')) return;
        try {
            await stopLiveSession(activeBooking.id, bayId);
            onUpdate();
            // Redirect to POS with auto-load param
            navigate(`/pos?loadBooking=${activeBooking.id}`);
        } catch (error) {
            console.error(error);
            alert('Error stopping session');
        }
    };

    const handleAddProduct = async (item) => {
        try {
            await addItemsToBooking(activeBooking.id, [item]);
            onUpdate(); // refresh to show items
        } catch (e) {
            console.error(e);
            alert('Failed to add item');
        }
    };

    return (
        <div style={{
            backgroundColor: isOccupied ? '#2a1515' : 'var(--color-bg-tertiary)',
            border: `1px solid ${isOccupied ? 'var(--color-danger)' : 'var(--color-success)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-md)',
            position: 'relative',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        backgroundColor: isOccupied ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isOccupied ? 'var(--color-danger)' : 'var(--color-success)'
                    }}>
                        <Timer size={18} />
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{bay?.name || bayId}</span>
                </div>
                <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: isOccupied ? 'var(--color-danger)' : 'var(--color-success)',
                    color: '#fff'
                }}>
                    {isOccupied ? 'OCCUPIED' : 'FREE'}
                </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Rate: {formatCurrency(bay?.rate || 150000)}/hr</div>
                {isOccupied && activeBooking && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '4px' }}>Customer: {activeBooking.customerName || 'Unknown'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Duration</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{elapsed}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Total</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                    {formatCurrency(cost)}
                                </div>
                            </div>
                        </div>

                        {/* Additional Items Section */}
                        {activeBooking.additionalItems && activeBooking.additionalItems.length > 0 && (
                            <div style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Added Products:</div>
                                {activeBooking.additionalItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc' }}>
                                        <span>{item.name} x{item.quantity}</span>
                                        <span>{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button
                            variant="secondary"
                            size="sm"
                            style={{ width: '100%', marginTop: '10px', fontSize: '0.9rem' }}
                            onClick={() => setShowAddProduct(true)}
                        >
                            <Plus size={14} style={{ marginRight: '4px' }} /> Add Products
                        </Button>
                    </div>
                )}
            </div>

            {isOccupied ? (
                <Button
                    onClick={handleStop}
                    style={{ width: '100%', backgroundColor: 'var(--color-danger)', border: 'none' }}
                >
                    <CreditCard size={18} style={{ marginRight: '8px' }} />
                    Finish Session
                </Button>
            ) : (
                <Button
                    onClick={() => setShowStartModal(true)}
                    style={{ width: '100%', backgroundColor: 'var(--color-success)', border: 'none' }}
                >
                    <Play size={18} style={{ marginRight: '8px' }} />
                    Start Rental
                </Button>
            )}

            {showStartModal && (
                <StartSessionModal
                    bay={bay}
                    onClose={() => setShowStartModal(false)}
                    onSuccess={() => { setShowStartModal(false); onUpdate(); }}
                />
            )}

            {showAddProduct && (
                <AddProductModal
                    onClose={() => setShowAddProduct(false)}
                    onAdd={handleAddProduct}
                />
            )}
        </div>
    );
};

import { getBikesByCustomer } from '../../services/db';

const StartSessionModal = ({ bay, onClose, onSuccess }) => {
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

    // Service Type
    const [serviceType, setServiceType] = useState('self_service');

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
            let customerData = {};
            if (isNew) {
                if (!newCust.name) return alert("Customer name required");
                customerData = { name: newCust.name, phone: newCust.phone };
            } else {
                const c = customers.find(c => c.id === selectedCustomerId);
                if (!c) return alert("Select a customer");
                customerData = { id: c.id, name: c.name };
            }

            let bikeData = null;
            if (isNewBike) {
                bikeData = { bike_model_id: newBike.bike_model_id, plate_number: newBike.plate_number };
            } else if (selectedBikeId) {
                bikeData = { id: selectedBikeId };
            }

            const options = {
                type: serviceType,
                mechanic_id: null // To be selected in Order details if needed
            };

            await startLiveSession(bay.id, customerData, bikeData, options);

            // Print Receipt
            printStartSessionReceipt(
                customerData.name,
                bay ? bay.name : 'Station',
                new Date(),
                bay ? bay.rate : 0
            );

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to start session');
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
                <h3 style={{ marginBottom: '16px' }}>Start Rental - {bay ? bay.name : 'Unknown Station'}</h3>

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

                {/* Service Type */}
                <div style={{ marginBottom: '20px', padding: '12px', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--color-success)' }}>Service Type</h4>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="radio" value="self_service" checked={serviceType === 'self_service'} onChange={(e) => setServiceType(e.target.value)} />
                            Self-Service
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="radio" value="service" checked={serviceType === 'service'} onChange={(e) => setServiceType(e.target.value)} />
                            With Mechanic
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Starting...' : 'Start Timer & Create Order'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AddProductModal = ({ onClose, onAdd }) => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts().then(data => {
            setProducts(Array.isArray(data) ? data : []);
            setLoading(false);
        });
    }, []);

    const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAdd = () => {
        if (!selectedProduct) return;
        onAdd({
            productId: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            quantity: parseInt(quantity)
        });
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%',
                border: '1px solid var(--color-border)',
                height: '500px', display: 'flex', flexDirection: 'column'
            }}>
                <h3 style={{ marginBottom: '16px' }}>Add Product to Session</h3>

                <input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        padding: '10px', marginBottom: '10px',
                        backgroundColor: 'var(--color-bg-tertiary)', border: 'none',
                        color: 'white', borderRadius: '4px'
                    }}
                    autoFocus
                />

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', border: '1px solid #333', borderRadius: '4px' }}>
                    {loading ? <p style={{ padding: '10px' }}>Loading...</p> : filtered.map(p => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedProduct(p)}
                            style={{
                                padding: '10px',
                                cursor: 'pointer',
                                backgroundColor: selectedProduct?.id === p.id ? 'var(--color-primary)' : 'transparent',
                                borderBottom: '1px solid #333'
                            }}
                        >
                            <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{formatCurrency(p.price)} | Stock: {p.stockQuantity}</div>
                        </div>
                    ))}
                </div>

                {selectedProduct && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span>Quantity:</span>
                        <input
                            type="number" min="1"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            style={{ width: '60px', padding: '5px', borderRadius: '4px' }}
                        />
                        <span>Total: {formatCurrency(selectedProduct.price * quantity)}</span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleAdd} disabled={!selectedProduct}>
                        Add Item
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LiveBayManager;

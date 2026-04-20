// src/pages/POS.jsx
import React, { useEffect, useState } from 'react';
import { getProducts, createTransaction, updateProduct, getPendingBookings, updateBookingPaymentStatus, addOrderItem, getOrder, updateOrder } from '../services/db';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Search, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { printSaleReceipt } from '../utils/printer';
import { formatCurrency } from '../utils/currency';

class PosErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("POS Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: '#fff', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
                    <h2 style={{ color: 'var(--color-danger)' }}>POS System Error</h2>
                    <p>Something went wrong loading the POS interface.</p>
                    <pre style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', overflow: 'auto' }}>
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '8px 16px', marginTop: '10px', cursor: 'pointer' }}
                    >
                        Reload Page
                    </button>
                    <p style={{ marginTop: '20px', fontSize: '0.9em', color: 'var(--color-text-muted)' }}>
                        Detailed check: Search products data for malformed entries.
                    </p>
                </div>
            );
        }
        return this.props.children;
    }
}

const POS = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [dataError, setDataError] = useState(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [customerName, setCustomerName] = useState('');

    const [pendingBookings, setPendingBookings] = useState([]);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [currentBookingId, setCurrentBookingId] = useState(null);

    const [attachOrderId, setAttachOrderId] = useState(null);
    const [attachOrderData, setAttachOrderData] = useState(null);

    useEffect(() => {
        fetchProducts();

        // Check for auto-load booking from Redirect
        const params = new URLSearchParams(window.location.search);
        const bookingId = params.get('loadBooking');
        if (bookingId) {
            // We need to fetch pending bookings first, then search within them
            // Because loadBookingToCart expects the full booking object
            getPendingBookings().then(data => {
                setPendingBookings(data); // good to list them anyway
                const booking = data.find(b => b.id === bookingId);
                if (booking) {
                    loadBookingToCart(booking);
                } else {
                    console.warn("Booking not found in pending list", bookingId);
                }
            }).catch(err => console.error("Auto-load failed", err));
        }

        const attachId = params.get('attachToOrder');
        if (attachId) {
            setAttachOrderId(attachId);
            getOrder(attachId).then(data => {
                if(data) setAttachOrderData(data);
            }).catch(err => console.error("Failed to load order info", err));
        }
    }, []);

    const fetchPending = async () => {
        try {
            const data = await getPendingBookings();
            setPendingBookings(data);
            setShowPendingModal(true);
        } catch (e) {
            console.error(e);
            alert('Failed to load pending services');
        }
    };

    const loadBookingToCart = (booking) => {
        // Clear cart or confirm? Let's just overwrite for now as "Start New Sale"
        if (cart.length > 0) {
            if (!confirm('This will clear current cart. Continue?')) return;
        }

        const newCart = [];

        // Add Rental
        if (booking.rentalPrice > 0) {
            newCart.push({
                id: 'rental-' + booking.id, // unique dummy id
                name: `Rental Service`, // simplified name
                price: booking.rentalPrice,
                quantity: 1,
                isService: true
            });
        }

        // Add Additional Items
        if (booking.additionalItems) {
            booking.additionalItems.forEach((item, idx) => {
                newCart.push({
                    id: item.productId || ('extra-' + idx),
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    isStockItem: !!item.productId // flag to deduct stock again? No, stock was NOT deducted during booking add! Wait, we need to check this.
                    // Implementation Plan said: "Stock deduction & Link Booking".
                    // If we add items in LiveManager, we didn't deduct stock yet. 
                    // So yes, treat them as normal items but with quantity pre-filled.
                });
            });
        }

        setCart(newCart);
        setCurrentBookingId(booking.id);
        setCustomerName(booking.customerName || '');
        setShowPendingModal(false);
    };

    const fetchProducts = async () => {
        try {
            const data = await getProducts();
            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                console.error("Data is not an array:", data);
                setProducts([]);
                setDataError("Invalid data format received from database");
            }
        } catch (e) {
            console.error("Failed to fetch products", e);
            setDataError("Failed to load products: " + e.message);
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(1, item.quantity + delta) };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckoutClick = () => {
        if (cart.length === 0) return;
        // Only clear name if NOT a booking checkout (preserve pre-filled name)
        if (!currentBookingId) {
            setCustomerName('');
        }
        setShowCheckoutModal(true);
    };

    const processSale = async () => {
        setLoading(true);
        try {
            const finalCustomerName = customerName.trim() || 'Walk-in Customer';

            const transactionData = {
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    priceAtSale: item.price,
                    costPrice: item.costPrice || 0
                })),
                total_amount: cartTotal,
                payment_method: 'cash',
                customer: finalCustomerName
            };

            // Create transaction (returns doc ref)
            await createTransaction(transactionData);

            // Print Receipt
            // We need to pass the date object manually as Firestore timestamp is server-side
            printSaleReceipt({ 
                items: transactionData.items, 
                total: transactionData.total_amount, 
                customerName: transactionData.customer, 
                date: new Date() 
            });

            // Update stock
            for (const item of cart) {
                // If it's a real product (has stock ID and not a pure service)
                // We use isService flag to skip rental.
                if (!item.isService && item.id && !item.id.startsWith('rental-')) {
                    // Check if product exists in our DB fetch
                    const product = products.find(p => p.id === item.id);
                    if (product) {
                        await updateProduct(product.id, {
                            stockQuantity: product.stockQuantity - item.quantity
                        });
                    }
                }
            }

            if (currentBookingId) {
                await updateBookingPaymentStatus(currentBookingId, 'paid');
                setCurrentBookingId(null);
            }

            setCart([]);
            setShowCheckoutModal(false);
            fetchProducts();
            // alert('Transaction successful!'); // Removed to reduce clicks, receipt confirms it
        } catch (error) {
            console.error(error);
            alert('Checkout failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const processAttachToOrder = async () => {
        setLoading(true);
        try {
            let totalAddedAmount = 0;
            let totalAddedCost = 0;

            for (const item of cart) {
                // Add to order items
                await addOrderItem({
                    order_id: attachOrderId,
                    product_id: item.id && !item.id.startsWith('rental-') ? item.id : null,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    costPrice: item.costPrice || 0,
                    type: item.isService ? 'service' : 'part'
                });

                totalAddedAmount += (item.price * item.quantity);
                totalAddedCost += ((item.costPrice || 0) * item.quantity);

                // Deduct stock if real product
                if (!item.isService && item.id && !item.id.startsWith('rental-')) {
                    const product = products.find(p => p.id === item.id);
                    if (product) {
                        await updateProduct(product.id, {
                            stockQuantity: product.stockQuantity - item.quantity
                        });
                    }
                }
            }

            // Update order totals
            const updatedAmount = (attachOrderData.total_amount || 0) + totalAddedAmount;
            const updatedCost = (attachOrderData.total_cost || 0) + totalAddedCost;
            await updateOrder(attachOrderId, {
                total_amount: updatedAmount,
                total_cost: updatedCost
            });

            alert('Items attached to order successfully!');
            // Redirect back to order
            window.location.href = `/orders/${attachOrderId}`;
        } catch (e) {
            console.error(e);
            alert('Failed to attach items to order: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'service', label: 'Services' },
        { id: 'fluid', label: 'Fluids' },
        { id: 'part', label: 'Parts' },
        { id: 'accessory', label: 'Accessories' }
    ];

    const filteredProducts = (products || []).filter(p => {
        if (!p) return false;
        const nameMatch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const skuMatch = (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = nameMatch || skuMatch;
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <PosErrorBoundary>
            {dataError && <div style={{ marginBottom: '10px', color: 'red' }}>{dataError}</div>}
            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', height: 'calc(100vh - 100px)' }}>
                {/* Product Grid (Left) */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>

                    {/* Category Filters */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-md)', overflowX: 'auto', paddingBottom: '4px', flexShrink: 0 }}>
                        <button
                            onClick={fetchPending}
                            style={{
                                padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                                backgroundColor: '#d97706', color: '#fff', fontWeight: 'bold', flexShrink: 0
                            }}
                        >
                            Pending Services
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedCategory === cat.id ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                                    color: selectedCategory === cat.id ? '#fff' : 'var(--color-text-primary)',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-md)', position: 'relative', flexShrink: 0 }}>
                        <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 40px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 'var(--spacing-md)',
                        overflowY: 'auto',
                        paddingBottom: '20px',
                        flex: 1,
                        minHeight: 0
                    }}>
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                style={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    border: '1px solid transparent',
                                    transition: 'border-color 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <div>
                                    <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>{product.name}</h4>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Stock: {product.stockQuantity}</p>
                                </div>
                                <div style={{ marginTop: '10px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                    {formatCurrency(product.price)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cart (Right) */}
                <div style={{
                    flex: 1,
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-lg)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-lg)' }}>
                        <ShoppingCart /> {attachOrderData ? `Attaching to Order: ${attachOrderData.order_number}` : 'Current Sale'}
                    </h2>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {cart.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '20px' }}>Cart is empty</p>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '500' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{formatCurrency(item.price)} x {item.quantity}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button onClick={() => updateQuantity(item.id, -1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}><Minus size={16} /></button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}><Plus size={16} /></button>
                                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', marginLeft: '8px' }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)', fontSize: '1.25rem', fontWeight: 'bold' }}>
                            <span>Total</span>
                            <span>{formatCurrency(cartTotal)}</span>
                        </div>
                        <Button block variant="primary" onClick={handleCheckoutClick} disabled={loading || cart.length === 0}>
                            {loading ? 'Processing...' : 'Complete Sale'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        padding: 'var(--spacing-xl)',
                        borderRadius: 'var(--radius-lg)',
                        width: '400px',
                        maxWidth: '90%'
                    }}>
                        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Confirm Sale</h2>

                        {!attachOrderData && (
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                                    Customer Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Walk-in Customer"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-bg-primary)',
                                        color: 'var(--color-text-primary)'
                                    }}
                                    autoFocus
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}>
                            Total: {formatCurrency(cartTotal)}
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <Button variant="secondary" onClick={() => setShowCheckoutModal(false)} block>
                                Cancel
                            </Button>
                            {attachOrderData ? (
                                <Button variant="primary" onClick={processAttachToOrder} disabled={loading} block>
                                    {loading ? 'Processing...' : 'Attach & Complete'}
                                </Button>
                            ) : (
                                <Button variant="primary" onClick={processSale} disabled={loading} block>
                                    {loading ? 'Printing...' : 'Confirm & Print'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {showPendingModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)',
                        width: '500px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <h2 style={{ marginBottom: '16px' }}>Pending Services</h2>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {pendingBookings.length === 0 ? <p>No pending payments.</p> : pendingBookings.map(b => (
                                <div key={b.id} style={{
                                    padding: '12px', marginBottom: '10px',
                                    backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '8px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{b.customerName || 'Walk-in'}</div>
                                        <div style={{ fontSize: '0.85em', color: '#ccc' }}>{formatCurrency(b.rentalPrice || 0)}</div>
                                        {b.additionalItems && <div style={{ fontSize: '0.8em', color: '#aaa' }}>+ {b.additionalItems.length} items</div>}
                                    </div>
                                    <Button size="sm" onClick={() => loadBookingToCart(b)}>Load to Cart</Button>
                                </div>
                            ))}
                        </div>
                        <Button style={{ marginTop: '16px' }} variant="secondary" onClick={() => setShowPendingModal(false)}>Close</Button>
                    </div>
                </div>
            )}
        </PosErrorBoundary>
    );
};

export default POS;

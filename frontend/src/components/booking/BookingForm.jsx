// src/components/booking/BookingForm.jsx
import React, { useState, useEffect } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { createBooking, getCustomers, addCustomer, checkBookingConflict } from '../../services/db';
import { addHours } from 'date-fns';
import { Plus } from 'lucide-react';

const BookingForm = ({ onClose, onSuccess, initialDate = new Date(), bays = [] }) => {
    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '', // Redundant if using ID, but keeping for display if needed
        bayId: bays.length > 0 ? bays[0].id : '',
        date: initialDate.toISOString().split('T')[0],
        startTimeString: '09:00',
        duration: 2
    });
    const [loading, setLoading] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [customerError, setCustomerError] = useState('');
    const [customers, setCustomers] = useState([]);
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '' });

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (!formData.bayId && bays.length > 0) {
            setFormData(prev => ({ ...prev, bayId: bays[0].id }));
        }
    }, [bays]);

    const fetchCustomers = async () => {
        const data = await getCustomers();
        setCustomers(data);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'customerId') {
            const customer = customers.find(c => c.id === value);
            setFormData(prev => ({ ...prev, customerId: value, customerName: customer ? customer.name : '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNewCustomerChange = (e) => {
        const { name, value } = e.target;
        setNewCustomerData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerData.name) return;
        setSavingCustomer(true);
        setCustomerError('');

        try {
            // Create a timeout promise
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out. Check your internet or Firebase Rules.")), 5000)
            );

            // Race between addCustomer and timeout
            const docRef = await Promise.race([
                addCustomer(newCustomerData),
                timeout
            ]);

            const newCustomer = { id: docRef.id, ...newCustomerData };
            setCustomers(prev => [...prev, newCustomer]);
            setFormData(prev => ({ ...prev, customerId: newCustomer.id, customerName: newCustomer.name }));
            setIsNewCustomer(false);
            setNewCustomerData({ name: '', phone: '', email: '' });
        } catch (error) {
            console.error("Error adding customer:", error);
            setCustomerError(error.message);
        } finally {
            setSavingCustomer(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const startDateTime = new Date(`${formData.date}T${formData.startTimeString}`);
            const endDateTime = addHours(startDateTime, Number(formData.duration));

            // Business Hours Validation
            const startHour = startDateTime.getHours();
            const endHour = endDateTime.getHours();
            const endMinutes = endDateTime.getMinutes();

            if (startHour < 9 || startHour >= 19) {
                alert("Bookings are only available between 09:00 and 19:00.");
                setLoading(false);
                return;
            }

            if (endHour > 19 || (endHour === 19 && endMinutes > 0)) {
                alert("Booking duration exceeds closing time (19:00). Please reduce duration or choose an earlier time.");
                setLoading(false);
                return;
            }

            // Check for overlaps
            const hasConflict = await checkBookingConflict(formData.bayId, startDateTime, endDateTime);
            if (hasConflict) {
                alert("This time slot is already booked for the selected bay. Please choose a different time or bay.");
                setLoading(false);
                return;
            }

            const selectedBay = bays.find(b => b.id === formData.bayId);
            const rate = selectedBay ? selectedBay.rate : 150000;

            await createBooking({
                customerName: formData.customerName, // We might want to store ID too
                customerId: formData.customerId,
                bayId: formData.bayId,
                startTime: startDateTime,
                endTime: endDateTime,
                status: 'booked',
                totalPrice: Number(formData.duration) * rate
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error creating booking:", error);
            alert("Failed to create booking");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Customer Selection Section */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                {!isNewCustomer ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Customer</label>
                            <select
                                name="customerId"
                                value={formData.customerId}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Select a Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <Button variant="secondary" onClick={() => setIsNewCustomer(true)} title="Add New Customer">
                            <Plus size={20} />
                        </Button>
                    </div>
                ) : (
                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', marginTop: '8px' }}>
                        <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>New Customer</h4>
                        <Input
                            label="Name"
                            name="name"
                            value={newCustomerData.name}
                            onChange={handleNewCustomerChange}
                            placeholder="Customer Name"
                            style={{ marginBottom: '12px' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '120px' }}>
                                <Input
                                    label="Phone"
                                    name="phone"
                                    value={newCustomerData.phone}
                                    onChange={handleNewCustomerChange}
                                    placeholder="Phone"
                                    style={{ marginBottom: '0' }}
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: '120px' }}>
                                <Input
                                    label="Email"
                                    name="email"
                                    value={newCustomerData.email}
                                    onChange={handleNewCustomerChange}
                                    placeholder="Email"
                                    style={{ marginBottom: '12px' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <Button variant="primary" onClick={handleCreateCustomer} disabled={savingCustomer} type="button" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                                {savingCustomer ? 'Saving...' : 'Save & Select'}
                            </Button>
                            <Button variant="secondary" onClick={() => setIsNewCustomer(false)} type="button" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Cancel</Button>
                        </div>
                        {customerError && (
                            <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginTop: '8px' }}>
                                {customerError}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Select Bay</label>
                <select
                    name="bayId"
                    value={formData.bayId}
                    onChange={handleChange}
                    style={{
                        width: '100%',
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '1rem',
                        outline: 'none'
                    }}
                >
                    {bays.map(bay => (
                        <option key={bay.id} value={bay.id}>{bay.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <Input
                    label="Date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Start Time (24h)</label>
                    <select
                        name="startTimeString"
                        value={formData.startTimeString}
                        onChange={handleChange}
                        required
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    >
                        {Array.from({ length: 11 }, (_, i) => i + 9).map(hour => {
                            const time = `${hour.toString().padStart(2, '0')}:00`;
                            return (
                                <option key={time} value={time}>
                                    {time}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            <Input
                label="Duration (Hours)"
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                itemMax="12"
                required
            />

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" style={{ flex: 1 }} disabled={loading}>
                    {loading ? 'Booking...' : 'Confirm Request'}
                </Button>
            </div>
        </form>
    );
};

export default BookingForm;

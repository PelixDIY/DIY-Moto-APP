// src/components/customers/CustomerForm.jsx
import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { addCustomer, updateCustomer, addBike } from '../../services/db';
import BikeSelector from '../common/BikeSelector';

const CustomerForm = ({ onClose, onSuccess, initialData = null }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        telegram: initialData?.telegram || '',
        instagram: initialData?.instagram || '',
        notes: initialData?.notes || ''
    });
    
    // Bike add state
    const [bikeModel, setBikeModel] = useState(null);
    const [plateNumber, setPlateNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let customerId;
            if (initialData?.id) {
                await updateCustomer(initialData.id, formData);
                customerId = initialData.id;
            } else {
                const docRef = await addCustomer(formData);
                customerId = docRef.id;
            }

            // Bind new bike if selected
            if (bikeModel) {
                await addBike({
                    client_id: customerId,
                    bike_model_id: bikeModel,
                    plate_number: plateNumber || ''
                });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving customer or bike:", error);
            alert("Failed to save data. Refer to console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Jane Doe"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <Input
                    label="Phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 234 567 8900"
                />
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <Input
                    label="Telegram"
                    name="telegram"
                    value={formData.telegram}
                    onChange={handleChange}
                    placeholder="@username or link"
                />
                <Input
                    label="Instagram"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    placeholder="@username or link"
                />
            </div>

            <Input
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes..."
            />

            <hr style={{ border: 'none', borderTop: '1px dashed var(--color-border)', margin: 'var(--spacing-xl) 0' }} />
            
            <h4 style={{ marginBottom: '10px', fontSize: '1rem', color: 'var(--color-primary)' }}>Add a Motorcycle (Optional)</h4>
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                <BikeSelector
                    value={bikeModel}
                    onChange={setBikeModel}
                />
                {bikeModel && (
                    <Input
                        label="Plate Number"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. DK 1234 ABC"
                    />
                )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                <Button variant="secondary" onClick={onClose} style={{ flex: 1 }} type="button">
                    Cancel
                </Button>
                <Button type="submit" variant="primary" style={{ flex: 1 }} disabled={loading}>
                    {loading ? 'Saving...' : (initialData ? 'Update Customer' : 'Add Customer')}
                </Button>
            </div>
        </form>
    );
};

export default CustomerForm;

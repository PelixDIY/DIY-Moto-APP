import React, { useEffect, useState } from 'react';
import { getAllClientBikes, getCustomers, getBikeModels } from '../../services/db';
import { Search, Plus, Edit2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import BikeSelector from '../common/BikeSelector';
import ServiceHistoryViewer from './ServiceHistoryViewer';

import { addBike, updateClientBike } from '../../services/db';

const ClientFleetTab = () => {
    const [fleet, setFleet] = useState([]);
    const [filteredFleet, setFilteredFleet] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [selectedBike, setSelectedBike] = useState(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [baseCustomers, setBaseCustomers] = useState([]);
    
    // Add / Edit form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadFleetData = async () => {
            setLoading(true);
            try {
                const [bikes, customers, models] = await Promise.all([
                    getAllClientBikes(),
                    getCustomers(),
                    getBikeModels()
                ]);

                const enrichedFleet = bikes.map(bike => {
                    const customer = customers.find(c => c.id === bike.client_id);
                    const model = models.find(m => m.id === bike.bike_model_id);
                    
                    return {
                        ...bike,
                        ownerName: customer ? customer.name : 'Unknown Owner',
                        ownerPhone: customer ? customer.phone : '',
                        modelName: model ? `${model.brand} ${model.model} ${model.variant || ''}`.trim() : (bike.brand ? `${bike.brand} ${bike.model}` : 'Unknown Model'),
                        cc: model ? model.cc : '',
                        last_mileage: bike.last_mileage || ''
                    };
                });

                setBaseCustomers(customers.sort((a,b) => a.name.localeCompare(b.name)));

                // Sort by owner name initially
                enrichedFleet.sort((a, b) => a.ownerName.localeCompare(b.ownerName));

                setFleet(enrichedFleet);
                setFilteredFleet(enrichedFleet);
            } catch (error) {
                console.error("Error loading fleet data:", error);
            }
            setLoading(false);
        };
        
        loadFleetData();
    }, []);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        setFilteredFleet(fleet.filter(bike => 
            bike.plate_number?.toLowerCase().includes(term) ||
            bike.ownerName.toLowerCase().includes(term) ||
            bike.modelName.toLowerCase().includes(term)
        ));
    }, [searchTerm, fleet]);

    const handleViewHistory = (bike) => {
        setSelectedBike(bike);
        setIsHistoryOpen(true);
    };

    const handleEditBike = (bike) => {
        setFormData({
            id: bike.id,
            client_id: bike.client_id || '',
            bike_model_id: bike.bike_model_id || '',
            plate_number: bike.plate_number || '',
            last_mileage: bike.last_mileage || '',
            notes: bike.notes || ''
        });
        setIsFormOpen(true);
    };

    const handleAddBike = () => {
        setFormData({
            client_id: '',
            bike_model_id: '',
            plate_number: '',
            last_mileage: '',
            notes: ''
        });
        setIsFormOpen(true);
    };

    const handleSaveBike = async (e) => {
        e.preventDefault();
        if (!formData.client_id) return alert("Please select a customer.");
        if (!formData.bike_model_id) return alert("Please select a bike model.");
        
        setSaving(true);
        try {
            if (formData.id) {
                const { id, ...dataToUpdate } = formData;
                await updateClientBike(id, dataToUpdate);
            } else {
                await addBike(formData);
            }
            setIsFormOpen(false);
            // Refresh
            // Not doing full window reload, just minimal
            window.location.reload(); 
        } catch (error) {
            console.error(error);
            alert("Error saving bike.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ color: 'var(--color-text-muted)' }}>Loading fleet data...</div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by plate, owner or model..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 10px 10px 40px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-primary)',
                            outline: 'none'
                        }}
                    />
                </div>
                <Button variant="primary" onClick={handleAddBike}>
                    <Plus size={18} style={{ marginRight: '8px' }} />
                    Add Motorcycle
                </Button>
            </div>

            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Plate Number</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Owner</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Motorcycle</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Mileage</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Notes</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFleet.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No motorcycles found.
                                </td>
                            </tr>
                        ) : (
                            filteredFleet.map(bike => (
                                <tr key={bike.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '1px' }}>
                                            {bike.plate_number || 'N/A'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: '500' }}>{bike.ownerName}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{bike.ownerPhone}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: '500' }}>{bike.modelName}</div>
                                        {bike.cc && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{bike.cc}cc</div>}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                                        {bike.last_mileage ? `${bike.last_mileage} km` : '-'}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                        {bike.notes || ''}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button 
                                            onClick={() => handleViewHistory(bike)}
                                            style={{
                                                backgroundColor: 'var(--color-primary)',
                                                color: 'white', border: 'none', padding: '6px 12px',
                                                borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', marginRight: '8px'
                                            }}
                                        >
                                            View History
                                        </button>
                                        <button 
                                            onClick={() => handleEditBike(bike)}
                                            style={{
                                                backgroundColor: 'transparent',
                                                color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', padding: '5px 10px',
                                                borderRadius: '4px', cursor: 'pointer'
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Motorcycle Summary">
                <ServiceHistoryViewer bike={selectedBike} onClose={() => setIsHistoryOpen(false)} />
            </Modal>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? "Edit Motorcycle" : "Add Motorcycle"}>
                <form onSubmit={handleSaveBike} style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Owner (Customer) *</label>
                        <select 
                            style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                            value={formData.client_id}
                            onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                            required
                        >
                            <option value="">Select a customer...</option>
                            {baseCustomers.map(c => (
                                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Motorcycle Model *</label>
                        <BikeSelector 
                            value={formData.bike_model_id}
                            onChange={(id) => setFormData({ ...formData, bike_model_id: id })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input
                            label="Plate Number *"
                            value={formData.plate_number}
                            onChange={e => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
                            required
                        />
                        <Input
                            label="Current Mileage (km)"
                            type="number"
                            value={formData.last_mileage}
                            onChange={e => setFormData({ ...formData, last_mileage: e.target.value })}
                        />
                    </div>

                    <Input
                        label="Notes"
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />

                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                        <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} style={{ flex: 1 }}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={saving} style={{ flex: 1 }}>
                            {saving ? 'Saving...' : 'Save Motorcycle'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ClientFleetTab;

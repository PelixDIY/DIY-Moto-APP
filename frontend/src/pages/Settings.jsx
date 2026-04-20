// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';
import { getBays, addBay, updateBay, deleteBay } from '../services/db';
import { formatCurrency } from '../utils/currency';
import { Edit, Trash2, Plus, Save } from 'lucide-react';

const Settings = () => {
    const { logout, currentUser } = useAuth();
    const [bays, setBays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBay, setEditingBay] = useState(null);
    const [formData, setFormData] = useState({ name: '', rate: '', type: 'standard', order: 0 });

    useEffect(() => {
        fetchBays();
    }, []);

    const fetchBays = async () => {
        setLoading(true);
        try {
            const data = await getBays();
            setBays(data);
        } catch (error) {
            console.error("Failed to load bays", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const handleEdit = (bay) => {
        setEditingBay(bay);
        setFormData({ name: bay.name, rate: bay.rate, type: bay.type || 'standard', order: bay.order || 0 });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this station? This may affect historical data display.')) return;
        try {
            await deleteBay(id);
            fetchBays();
        } catch (error) {
            console.error(error);
            alert('Failed to delete station');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                rate: Number(formData.rate),
                type: formData.type,
                order: Number(formData.order)
            };

            if (editingBay) {
                await updateBay(editingBay.id, payload);
            } else {
                await addBay(payload);
            }
            setIsModalOpen(false);
            setEditingBay(null);
            fetchBays();
        } catch (error) {
            console.error(error);
            alert('Failed to save station');
        }
    };

    const openNewBayModal = () => {
        setEditingBay(null);
        setFormData({ name: '', rate: '', type: 'standard', order: bays.length + 1 });
        setIsModalOpen(true);
    };

    return (
        <div>
            <h1 style={{ marginBottom: 'var(--spacing-xl)', fontSize: '1.875rem' }}>Settings</h1>

            <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Station Management</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>Manage rental bays, lifts, and their hourly rates.</p>

                {loading ? <p>Loading stations...</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 'var(--spacing-lg)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>Order</th>
                                    <th style={{ padding: '12px' }}>Name</th>
                                    <th style={{ padding: '12px' }}>Type</th>
                                    <th style={{ padding: '12px' }}>Rate (Hourly)</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bays.map(bay => (
                                    <tr key={bay.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                        <td style={{ padding: '12px' }}>{bay.order}</td>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{bay.name}</td>
                                        <td style={{ padding: '12px', textTransform: 'capitalize' }}>{bay.type}</td>
                                        <td style={{ padding: '12px' }}>{formatCurrency(bay.rate)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <button onClick={() => handleEdit(bay)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', marginRight: '10px' }}>
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(bay.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Button onClick={openNewBayModal}>
                            <Plus size={18} style={{ marginRight: '8px' }} /> Add Station
                        </Button>
                    </div>
                )}
            </div>

            <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Account</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                    Logged in as: <strong>{currentUser?.email}</strong>
                </p>
                <Button variant="danger" onClick={handleLogout}>
                    Log Out
                </Button>
            </div>

            {isModalOpen && (
                <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingBay ? "Edit Station" : "Add Station"}>
                    <form onSubmit={handleSave}>
                        <Input
                            label="Station Name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)'
                                }}
                            >
                                <option value="standard">Standard Bay</option>
                                <option value="lift">Hydraulic Lift</option>
                            </select>
                        </div>
                        <Input
                            label="Hourly Rate"
                            type="number"
                            value={formData.rate}
                            onChange={e => setFormData({ ...formData, rate: e.target.value })}
                            required
                        />
                        <Input
                            label="Display Order"
                            type="number"
                            value={formData.order}
                            onChange={e => setFormData({ ...formData, order: e.target.value })}
                            required
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
                            <Button variant="primary" type="submit">Save Station</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Settings;

import React, { useEffect, useState } from 'react';
import { getBikeModels, updateBikeModel, addBikeModel } from '../../services/db';
import { Search, Edit2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const ModelCatalogTab = () => {
    const [models, setModels] = useState([]);
    const [filteredModels, setFilteredModels] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState(null);

    const loadModels = async () => {
        setLoading(true);
        try {
            const data = await getBikeModels();
            // Optional: Sort by brand then model
            data.sort((a, b) => {
                const brandCompare = a.brand.localeCompare(b.brand);
                if (brandCompare !== 0) return brandCompare;
                return a.model.localeCompare(b.model);
            });
            setModels(data);
            setFilteredModels(data);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadModels();
    }, []);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        setFilteredModels(models.filter(m => 
            m.brand.toLowerCase().includes(term) ||
            m.model.toLowerCase().includes(term) ||
            (m.variant && m.variant.toLowerCase().includes(term))
        ));
    }, [searchTerm, models]);

    const handleEdit = (model) => {
        setEditingModel(model);
        setIsEditModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingModel.id) {
                const id = editingModel.id;
                const dataToSave = { ...editingModel };
                delete dataToSave.id;
                await updateBikeModel(id, dataToSave);
            } else {
                await addBikeModel(editingModel);
            }
            setIsEditModalOpen(false);
            loadModels();
        } catch (error) {
            console.error("Failed to save model:", error);
            alert("Error saving model");
        }
    };

    if (loading) return <div style={{ color: 'var(--color-text-muted)' }}>Loading catalog...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search models..."
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
                <Button onClick={() => handleEdit({ brand: '', model: '', variant: '', cc: 150, type: 'scooter', service_interval_km: 2000, oil_volume: 1.0, oil_type: '', common_issues: '' })}>
                    Add New Model
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
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Brand</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Model</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Variant</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Type</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>CC</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Oil Volume</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredModels.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No models found.
                                </td>
                            </tr>
                        ) : (
                            filteredModels.map(m => (
                                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{m.brand}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{m.model}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{m.variant || '-'}</td>
                                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{m.type || 'other'}</td>
                                    <td style={{ padding: '12px 16px' }}>{m.cc}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{m.oil_volume ? `${m.oil_volume}L` : '-'}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button 
                                            onClick={() => handleEdit(m)}
                                            style={{
                                                background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px'
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

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={editingModel?.id ? "Edit Model" : "Add Model"}>
                {editingModel && (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Brand</label>
                                <input
                                    type="text"
                                    required
                                    value={editingModel.brand}
                                    onChange={e => setEditingModel({...editingModel, brand: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Model</label>
                                <input
                                    type="text"
                                    required
                                    value={editingModel.model}
                                    onChange={e => setEditingModel({...editingModel, model: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Variant</label>
                                <input
                                    type="text"
                                    value={editingModel.variant}
                                    onChange={e => setEditingModel({...editingModel, variant: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Engine Displacement (CC)</label>
                                <input
                                    type="number"
                                    required
                                    value={editingModel.cc}
                                    onChange={e => setEditingModel({...editingModel, cc: Number(e.target.value)})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Type</label>
                                <select
                                    value={editingModel.type}
                                    onChange={e => setEditingModel({...editingModel, type: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                >
                                    <option value="scooter">Scooter</option>
                                    <option value="sport">Sport</option>
                                    <option value="dirt">Dirt</option>
                                    <option value="cruiser">Cruiser</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Oil Volume (Liters)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingModel.oil_volume || ''}
                                    onChange={e => setEditingModel({...editingModel, oil_volume: Number(e.target.value)})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Recommended Oil Type</label>
                                <input
                                    type="text"
                                    value={editingModel.oil_type || ''}
                                    onChange={e => setEditingModel({...editingModel, oil_type: e.target.value})}
                                    placeholder="e.g. 10w-40"
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Service Interval (km)</label>
                                <input
                                    type="number"
                                    value={editingModel.service_interval_km || ''}
                                    onChange={e => setEditingModel({...editingModel, service_interval_km: Number(e.target.value)})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Common Issues / Notes</label>
                            <textarea
                                value={editingModel.common_issues || ''}
                                onChange={e => setEditingModel({...editingModel, common_issues: e.target.value})}
                                rows="3"
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'white', resize: 'vertical' }}
                            ></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <Button type="button" onClick={() => setIsEditModalOpen(false)} style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)' }}>Cancel</Button>
                            <Button type="submit">Save Model</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default ModelCatalogTab;

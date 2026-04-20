import React, { useState, useEffect } from 'react';
import { getBikeModels, addBikeModel, seedBikeModels } from '../../services/db';
import Input from './Input';
import Button from './Button';
import { Search, Plus } from 'lucide-react';

const BikeSelector = ({ value, onChange }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    // Add new state
    const [isAdding, setIsAdding] = useState(false);
    const [newBike, setNewBike] = useState({ brand: '', model: '', variant: '', cc: '', type: 'scooter', oil_type: '', oil_volume: '' });
    const [savingItem, setSavingItem] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Auto-seed if collection is empty
            await seedBikeModels();
            const data = await getBikeModels();
            setModels(data || []);
        } catch (e) {
            console.error("Failed to load bike models", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNew = async () => {
        if (!newBike.brand || !newBike.model) return alert('Brand and Model are required.');
        setSavingItem(true);
        try {
            const data = {
                brand: newBike.brand,
                model: newBike.model,
                variant: newBike.variant,
                cc: Number(newBike.cc) || null,
                type: newBike.type,
                oil_type: newBike.oil_type,
                oil_volume: Number(newBike.oil_volume) || null
            };
            const result = await addBikeModel(data);
            const addedModel = { id: result.id, ...data };
            
            setModels(prev => [...prev, addedModel].sort((a,b) => a.brand.localeCompare(b.brand)));
            onChange(addedModel.id);
            setSearch(`${addedModel.brand} ${addedModel.model} ${addedModel.variant}`.trim());
            setIsAdding(false);
            setIsOpen(false);
        } catch (e) {
            console.error(e);
            alert('Failed to save bike model');
        } finally {
            setSavingItem(false);
        }
    };

    // Derived values
    const selectedModel = models.find(m => m.id === value);
    const filteredModels = models.filter(m => {
        const full = `${m.brand} ${m.model} ${m.variant}`.toLowerCase();
        return full.includes(search.toLowerCase());
    });

    // Keep inputs synced
    useEffect(() => {
        if (selectedModel && !isOpen) {
            setSearch(`${selectedModel.brand} ${selectedModel.model} ${selectedModel.variant || ''}`.trim());
        }
    }, [selectedModel, isOpen]);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {isAdding ? (
                <div style={{ padding: '12px', border: '1px solid var(--color-primary)', borderRadius: '8px', backgroundColor: 'var(--color-bg-tertiary)', marginTop: '8px' }}>
                    <h5 style={{ margin: '0 0 12px 0', color: 'var(--color-primary)' }}>Add New Catalog Model</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <Input label="Brand *" value={newBike.brand} onChange={e => setNewBike({...newBike, brand: e.target.value})} autoFocus />
                        <Input label="Model *" value={newBike.model} onChange={e => setNewBike({...newBike, model: e.target.value})} />
                        <Input label="Variant" value={newBike.variant} onChange={e => setNewBike({...newBike, variant: e.target.value})} />
                        <Input label="CC" type="number" value={newBike.cc} onChange={e => setNewBike({...newBike, cc: e.target.value})} />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Type</label>
                            <select style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} value={newBike.type} onChange={e => setNewBike({...newBike, type: e.target.value})}>
                                <option value="scooter">Scooter</option>
                                <option value="sport">Sport</option>
                                <option value="dirt">Dirt</option>
                                <option value="cruiser">Cruiser</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button type="button" variant="primary" size="sm" onClick={handleSaveNew} disabled={savingItem}>{savingItem ? 'Saving...' : 'Save Model'}</Button>
                    </div>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-secondary)' }} />
                        <input
                            type="text"
                            placeholder={loading ? 'Loading models...' : 'Search brand or model...'}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setIsOpen(true);
                                onChange(''); // Clear selection when typing
                            }}
                            onFocus={() => setIsOpen(true)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 40px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                    </div>

                    {isOpen && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                            borderRadius: '6px', maxHeight: '250px', overflowY: 'auto', zIndex: 50,
                            marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            {filteredModels.map(m => (
                                <div
                                    key={m.id}
                                    style={{
                                        padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                                        backgroundColor: selectedModel?.id === m.id ? 'var(--color-bg-tertiary)' : 'transparent'
                                    }}
                                    onClick={() => {
                                        onChange(m.id);
                                        setSearch(`${m.brand} ${m.model} ${m.variant || ''}`.trim());
                                        setIsOpen(false);
                                    }}
                                >
                                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.brand} {m.model} {m.variant}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{m.cc ? `${m.cc}cc` : ''} {m.type}</div>
                                </div>
                            ))}
                            {filteredModels.length === 0 && search && (
                                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                    No models found.
                                </div>
                            )}
                            <div 
                                style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}
                                onClick={() => {
                                    setNewBike(prev => ({...prev, brand: search.split(' ')[0] || '', model: search.split(' ').slice(1).join(' ') || ''}));
                                    setIsAdding(true);
                                    setIsOpen(false);
                                }}
                            >
                                <Plus size={16} /> Add Custom Model
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BikeSelector;

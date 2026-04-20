// src/pages/Customers.jsx
import React, { useEffect, useState } from 'react';
import { getCustomers, getBikesByCustomer, getBikeModels } from '../services/db';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import ClientFleetTab from '../components/customers/ClientFleetTab';
import ModelCatalogTab from '../components/customers/ModelCatalogTab';
import { Plus, Search, User, Phone, Mail } from 'lucide-react';

const CustomerBikes = ({ clientId }) => {
    const [bikes, setBikes] = useState([]);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getBikesByCustomer(clientId),
            getBikeModels()
        ]).then(([clientBikes, allModels]) => {
            setBikes(clientBikes);
            setModels(allModels);
            setLoading(false);
        }).catch(console.error);
    }, [clientId]);

    if(loading) return <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Loading bikes...</div>;
    if(bikes.length === 0) return null;

    return (
        <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Bikes:</div>
            {bikes.map(b => {
                const model = models.find(m => m.id === b.bike_model_id);
                const title = model ? `${model.brand} ${model.model} ${model.variant || ''}` : (b.brand ? `${b.brand} ${b.model}` : 'Unknown Bike');
                return (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>{title}</span>
                        {b.plate_number && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', padding: '2px 6px', backgroundColor: 'var(--color-bg-primary)', borderRadius: '4px' }}>{b.plate_number}</span>}
                    </div>
                );
            })}
        </div>
    );
};

const Customers = () => {
    const [activeTab, setActiveTab] = useState('clients');
    
    // Existing customers state...
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCustomer, setEditingCustomer] = useState(null);

    const fetchCustomers = async () => {
        setLoading(true);
        const data = await getCustomers();
        setCustomers(data);
        setFilteredCustomers(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        setFilteredCustomers(customers.filter(c =>
            c.name.toLowerCase().includes(term) ||
            c.phone?.includes(term) ||
            c.email?.toLowerCase().includes(term)
        ));
    }, [searchTerm, customers]);

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    const tabStyle = (id) => ({
        padding: '10px 20px',
        cursor: 'pointer',
        borderBottom: activeTab === id ? '3px solid var(--color-primary)' : '3px solid transparent',
        color: activeTab === id ? 'white' : 'var(--color-text-muted)',
        fontWeight: activeTab === id ? 'bold' : 'normal',
        fontSize: '1rem',
        backgroundColor: 'transparent',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        transition: 'all 0.2s ease'
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h1 style={{ fontSize: '1.875rem' }}>Customer & Fleet Management</h1>
                {activeTab === 'clients' && (
                    <Button onClick={handleAdd}>
                        <Plus size={20} /> Add Customer
                    </Button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--spacing-lg)' }}>
                <button style={tabStyle('clients')} onClick={() => setActiveTab('clients')}>Client Directory</button>
                <button style={tabStyle('fleet')} onClick={() => setActiveTab('fleet')}>Client Fleet (Garage)</button>
                <button style={tabStyle('catalog')} onClick={() => setActiveTab('catalog')}>Model Catalog</button>
            </div>

            {activeTab === 'clients' && (
                <div>
                    <div style={{ marginBottom: 'var(--spacing-lg)', position: 'relative', maxWidth: '400px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search customers..."
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {filteredCustomers.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>No customers found.</p>
                        ) : (
                            filteredCustomers.map(customer => (
                                <div key={customer.id} style={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    padding: 'var(--spacing-lg)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--color-bg-tertiary)',
                                    position: 'relative'
                                }}>
                                    <button
                                        onClick={() => handleEdit(customer)}
                                        style={{
                                            position: 'absolute', top: '15px', right: '15px',
                                            background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '10px', borderRadius: '50%' }}>
                                            <User size={24} color="var(--color-primary)" />
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{customer.name}</h3>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                        {customer.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Phone size={16} /> {customer.phone}
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Mail size={16} /> {customer.email}
                                            </div>
                                        )}
                                        {(customer.telegram || customer.instagram) && (
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                                {customer.telegram && (
                                                    <a href={customer.telegram.startsWith('http') ? customer.telegram : `https://t.me/${customer.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: '500' }}>
                                                        Telegram
                                                    </a>
                                                )}
                                                {customer.instagram && (
                                                    <a href={customer.instagram.startsWith('http') ? customer.instagram : `https://instagram.com/${customer.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ color: '#d946ef', textDecoration: 'none', fontWeight: '500' }}>
                                                        Instagram
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        <CustomerBikes clientId={customer.id} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Edit Customer" : "New Customer"}>
                        <CustomerForm
                            onClose={() => setIsModalOpen(false)}
                            onSuccess={fetchCustomers}
                            initialData={editingCustomer}
                        />
                    </Modal>
                </div>
            )}
            
            {activeTab === 'fleet' && <ClientFleetTab />}
            {activeTab === 'catalog' && <ModelCatalogTab />}
            
        </div>
    );
};

export default Customers;

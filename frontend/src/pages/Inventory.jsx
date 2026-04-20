// src/pages/Inventory.jsx
import React, { useEffect, useState } from 'react';
import { getProducts, deleteProduct } from '../services/db';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ProductForm from '../components/pos/ProductForm';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        const data = await getProducts();
        setProducts(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            await deleteProduct(id);
            fetchProducts();
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h1 style={{ fontSize: '1.875rem' }}>Warehouse Accounting</h1>
                <Button onClick={handleAdd}>
                    <Plus size={20} /> Add Product
                </Button>
            </div>

            <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Name</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Category</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>SKU</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Cost</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Price</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Stock</th>
                            <th style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No products found. Add some!
                                </td>
                            </tr>
                        ) : (
                            products.map(product => (
                                <tr key={product.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                                    <td style={{ padding: 'var(--spacing-md)' }}>{product.name}</td>
                                    <td style={{ padding: 'var(--spacing-md)', textTransform: 'capitalize' }}>{product.category}</td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>{product.sku || '-'}</td>
                                    <td style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>{formatCurrency(product.costPrice || 0)}</td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>{formatCurrency(product.price)}</td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>
                                        <span style={{
                                            color: product.stockQuantity < 5 ? 'var(--color-danger)' : 'var(--color-success)',
                                            fontWeight: 'bold'
                                        }}>
                                            {product.stockQuantity}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Button variant="secondary" onClick={() => handleEdit(product)} style={{ padding: '6px' }}><Edit size={16} /></Button>
                                            <Button variant="danger" onClick={() => handleDelete(product.id)} style={{ padding: '6px' }}><Trash2 size={16} /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? "Edit Product" : "Add New Product"}
            >
                <ProductForm
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchProducts}
                    productToEdit={editingProduct}
                />
            </Modal>
        </div>
    );
};

export default Inventory;

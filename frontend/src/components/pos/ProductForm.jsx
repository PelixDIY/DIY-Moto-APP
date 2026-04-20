// src/components/pos/ProductForm.jsx
import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { addProduct, updateProduct } from '../../services/db';

const ProductForm = ({ onClose, onSuccess, productToEdit }) => {
    const [formData, setFormData] = useState({
        name: productToEdit?.name || '',
        category: productToEdit?.category || 'part',
        costPrice: productToEdit?.costPrice || '',
        price: productToEdit?.price || '',
        stockQuantity: productToEdit?.stockQuantity || '',
        sku: productToEdit?.sku || ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = {
                ...formData,
                costPrice: Number(formData.costPrice),
                price: Number(formData.price),
                stockQuantity: Number(formData.stockQuantity)
            };

            if (productToEdit) {
                await updateProduct(productToEdit.id, data);
            } else {
                await addProduct(data);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Failed to save product");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Input
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Oil Filter"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Category</label>
                    <select
                        name="category"
                        value={formData.category}
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
                        <option value="part">Part</option>
                        <option value="accessory">Accessory</option>
                        <option value="fluid">Fluid</option>
                        <option value="service">Service</option>
                    </select>
                </div>

                <Input
                    label="SKU / Code"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="OF-123"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                <Input
                    label="Cost Price ($)"
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                />
                <Input
                    label="Sell Price ($)"
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                />
                <Input
                    label="Stock Qty"
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    required
                    placeholder="0"
                />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" style={{ flex: 1 }} disabled={loading}>
                    {productToEdit ? 'Update Product' : 'Add Product'}
                </Button>
            </div>
        </form>
    );
};

export default ProductForm;

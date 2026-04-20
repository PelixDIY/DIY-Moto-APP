// src/components/common/Input.jsx
import React from 'react';

const Input = ({ label, type = 'text', placeholder, value, onChange, required = false, name, style, ...props }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)', ...style }}>
            {label && <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{label}</label>}
            <input
                name={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                {...props}
                style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
        </div>
    );
};

export default Input;

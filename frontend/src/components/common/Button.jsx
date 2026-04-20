// src/components/common/Button.jsx
import React from 'react';

const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, style, block = false }) => {
    const baseStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'background-color 0.2s',
        width: block ? '100%' : 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        ...style
    };

    const variants = {
        primary: {
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
        },
        secondary: {
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
        },
        outline: {
            backgroundColor: 'transparent',
            border: '1px solid var(--color-primary)',
            color: 'var(--color-primary)',
        },
        danger: {
            backgroundColor: 'var(--color-danger)',
            color: '#fff',
        }
    };

    const variantStyle = variants[variant] || variants.primary;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={{ ...baseStyle, ...variantStyle }}
            onMouseOver={(e) => {
                if (!disabled && variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
            }}
            onMouseOut={(e) => {
                if (!disabled && variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }}
        >
            {children}
        </button>
    );
};

export default Button;

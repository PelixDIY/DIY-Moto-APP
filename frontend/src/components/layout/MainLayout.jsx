// src/components/layout/MainLayout.jsx
import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout = () => {
    const { currentUser } = useAuth();
    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: 'var(--spacing-xl)', overflowY: 'auto' }}>
                <header style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ color: 'var(--color-text-primary)' }}>
                        {/* Header content could be dynamic based on route */}
                        Station Management
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                            {currentUser ? currentUser.email : 'Welcome, User'}
                        </span>
                        {/* Logout button placeholder */}
                    </div>
                </header>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;

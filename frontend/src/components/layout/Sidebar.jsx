import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, ShoppingCart, Users, Settings, DollarSign, Package, ChevronLeft, ChevronRight, FileText, BarChart2 } from 'lucide-react';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const NavItem = ({ to, icon: Icon, label }) => {
        const isActive = location.pathname === to;
        return (
            <Link
                to={to}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : 'var(--spacing-sm)',
                    padding: '12px',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    backgroundColor: isActive ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                }}
                title={isCollapsed ? label : ''}
            >
                <Icon size={20} />
                {!isCollapsed && <span>{label}</span>}
            </Link>
        );
    };

    return (
        <aside style={{
            width: isCollapsed ? '70px' : '250px',
            backgroundColor: 'var(--color-bg-secondary)',
            height: '100vh',
            padding: 'var(--spacing-md)',
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            flexShrink: 0
        }}>
            <div style={{
                marginBottom: 'var(--spacing-xl)',
                color: 'var(--color-primary)',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textAlign: isCollapsed ? 'center' : 'left'
            }}>
                {isCollapsed ? 'DMG' : 'DIY MotoGarage'}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', flex: 1 }}>
                <NavItem to="/" icon={Home} label="Dashboard" />
                <NavItem to="/reports" icon={BarChart2} label="Reports" />
                <NavItem to="/orders" icon={FileText} label="Orders (Job Cards)" />
                <NavItem to="/bookings" icon={Calendar} label="Bookings" />
                <NavItem to="/pos" icon={ShoppingCart} label="POS" />
                <NavItem to="/inventory" icon={Package} label="Inventory" />
                <NavItem to="/sales-log" icon={DollarSign} label="Sales Log" />
                <NavItem to="/customers" icon={Users} label="Customers" />
                <NavItem to="/expenses" icon={DollarSign} label="Expenses Log" />
                <NavItem to="/settings" icon={Settings} label="Settings" />
            </nav>

            <button
                onClick={toggleSidebar}
                style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 'auto'
                }}
            >
                {isCollapsed ? <ChevronRight size={20} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ChevronLeft size={20} /> <span>Collapse</span></div>}
            </button>
        </aside>
    );
};

export default Sidebar;

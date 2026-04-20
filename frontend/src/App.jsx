// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Bookings from './pages/Bookings';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import POS from './pages/POS';
import Customers from './pages/Customers';
import SalesLog from './pages/SalesLog';
import ExpensesLog from './pages/ExpensesLog';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';

function App() {
  return (
    <GlobalErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetails />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="pos" element={<POS />} />
              <Route path="customers" element={<Customers />} />
              <Route path="sales-log" element={<SalesLog />} />
              <Route path="expenses" element={<ExpensesLog />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              {/* Catch all redirect to dashboard or 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </GlobalErrorBoundary>
  );
}

export default App;

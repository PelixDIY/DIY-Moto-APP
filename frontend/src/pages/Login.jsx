// src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Import auth create
import { auth } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore'; // Import firestore
import { db } from '../services/firebase';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Wrench } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);

            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, 'users', user.uid), {
                    name: email.split('@')[0],
                    email: email,
                    role: 'admin'
                });
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err) {
            setError('Failed to ' + (isRegistering ? 'register' : 'log in') + ': ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-bg-primary)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: 'var(--spacing-xl)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{
                        backgroundColor: 'var(--color-primary)',
                        padding: '12px',
                        borderRadius: '50%',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <Wrench color="white" size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{isRegistering ? 'Create Account' : 'Partner Login'}</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>DIY MotoGarage Manager</p>
                </div>

                {error && <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-danger)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--spacing-md)',
                    fontSize: '0.875rem'
                }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="admin@diymoto.com"
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                    <Button type="submit" block disabled={loading}>
                        {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Log In')}
                    </Button>

                    <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
                        <button
                            type="button"
                            onClick={() => setIsRegistering(!isRegistering)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            {isRegistering ? 'Already have an account? Log In' : 'Need an account? Register'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;

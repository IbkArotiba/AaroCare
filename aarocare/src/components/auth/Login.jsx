import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@/components/auth/auth.css'
import { useAuth } from '../../contexts/AuthContext';
import Logo from '@/components/auth/Logo.jpeg';


const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        // Use the login function from AuthContext instead of signInWithSecret
        await login(formData.email, formData.password);
        navigate('/dashboard'); // Navigate to a route that exists in your app
      } catch (err) {
        console.error('Sign in error:', err);
        setError(err.message || 'Failed to sign in');
      } finally {
        setLoading(false);
      }
    };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <img src={Logo} alt="Logo" className="logo" />
        <h1 className="text-4xl font-bold text-primary-600 mb-2">AaroCare</h1>
        <p className="mb-6 text-gray-600">Healthcare Management Platform</p>
        
        <h2>Sign in to your account</h2>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div>
            <label className="email-address">
              Email address:
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label className="password">
              Password:
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Password"
              minLength="6"
              value={formData.password}
              onChange={handleChange}
            />
            <span
              onClick={togglePasswordVisibility}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </span>
          </div>
          <div>
            <div>
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label className="rememberMe">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p>
            Don't have an account?{' '}
            <Link to="/signup">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
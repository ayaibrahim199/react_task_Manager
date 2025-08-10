import { useState, useContext } from 'react';
import api from '../lib/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const validate = () => {
    const fieldErrors = {};
    const emailRe = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!email.trim()) fieldErrors.email = 'Email is required';
    else if (!emailRe.test(email)) fieldErrors.email = 'Enter a valid email';
    if (!password) fieldErrors.password = 'Password is required';
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      login(data, data.token);
      showToast('Welcome back!', 'success');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      const fields = error.response?.data?.errors || [];
      const fieldMap = {};
      fields.forEach(f => { fieldMap[f.field] = f.message; });
      setErrors(fieldMap);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-800">Login</h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              placeholder="Enter your email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm bg-white text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} 
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
            <input 
              type={showPassword ? 'text' : 'password'}
              id="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm bg-white text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`} 
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-500"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
          >
            <span className="flex items-center justify-center gap-2">
              {loading && <Spinner />}
              {loading ? 'Signing in...' : 'Login'}
            </span>
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Register here</Link>
        </p>
      </div>
    </div>
  );
}
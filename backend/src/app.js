const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables with an absolute path
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Dynamic CORS: allow comma-separated CORS_ORIGINS plus localhost during development
const defaultOrigins = ['http://localhost:5173'];
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);
const vercelRegex = /^https?:\/\/([a-z0-9-]+\.)*vercel\.app$/i;
const renderRegex = /^https?:\/\/([a-z0-9-]+\.)*onrender\.com$/i;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps, curl
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (vercelRegex.test(origin) || renderRegex.test(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Basic security headers
app.use(helmet());

// Rate limit API to mitigate brute force
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', apiLimiter);

// Respond to all OPTIONS requests with 204 (CORS headers already set above)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Use middleware to parse JSON bodies
app.use(express.json());

// Simple health endpoint for Render/Vercel probes
app.get('/health', (req, res) => res.json({ ok: true }));

console.log('Attempting to connect to MongoDB...');

// Prefer env PORT if provided and not 5000 (avoid macOS ControlCenter on 5000), otherwise default to 5001
const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
const PORT = envPort && envPort !== 5000 ? envPort : 5001;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected successfully!');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Centralized error handler (must be last)
app.use(errorHandler);

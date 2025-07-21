const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler  = require('./middleware/errorHandler');
const auditLogger = require('./middleware/auditLogger');
const requestSanitizer = require('./middleware/requestSanitizer');

const app = express();

// Security middleware
app.use(helmet());

// Configure CORS to allow requests from frontend
app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(requestSanitizer);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Audit logging
app.use(auditLogger.middleware);

// Root API routes for health check
app.get('/api', (req, res) => {
  console.log('API root endpoint accessed');
  res.status(200).json({ 
    status: 'ok',
    message: 'AaroCare API is running',
    timestamp: new Date().toISOString()
  });
});

// Also handle with trailing slash
app.get('/api/', (req, res) => {
  console.log('API root endpoint accessed (with trailing slash)');
  res.status(200).json({ 
    status: 'ok',
    message: 'AaroCare API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/patients', require('./routes/patients'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/statistics', require('./routes/statistics'));

// Register care team routes
app.use('/api/care-teams', require('./routes/careTeam'));

// Register treatment plan routes
app.use('/api/treatment-plans', require('./routes/treatment'));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

module.exports = app;

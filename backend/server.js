console.log('🚀 Starting AaroCare backend...');
console.log('📍 PORT:', process.env.PORT || 8080);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

console.log('✅ Basic modules loaded successfully');

// Add health routes FIRST (before any middleware)
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

app.get('/', (req, res) => {
  console.log('🏠 Root endpoint requested');
  res.status(200).json({
    status: 'OK',
    message: 'AaroCare API is running',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Health routes added');

// Simple CORS (no complex options)
app.use(cors({
  origin: true, // Allow all origins for now
  credentials: true
}));

console.log('✅ CORS configured');

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

console.log('✅ Basic middleware configured');

// Add test routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// ADD THIS - Railway health check route
app.get('/api/health', (req, res) => {
  console.log('🏥 API Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    service: 'AaroCare API'
  });
});

console.log('✅ Test routes added');

try {
  console.log('📁 Loading auth routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('⚠️ Auth routes failed to load:', error.message);
  console.log('📍 Continuing without auth routes...');
}

console.log('🔍 Environment check:');
console.log(`  - PORT: ${PORT}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - AWS_REGION: ${process.env.AWS_REGION ? '✓' : '✗ MISSING'}`);
console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓' : '✗ MISSING'}`);

try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🏥 API Health check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/api/test`);
    console.log('✅ Minimal server started successfully');
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, keeping server alive...');
  // Don't exit immediately - let Railway handle the shutdown
});

process.on('SIGINT', () => {
  console.log('SIGINT received, graceful shutdown...');
  process.exit(0);
});

// Keep the process alive
const keepAlive = setInterval(() => {
  console.log('💓 Server heartbeat - uptime:', Math.floor(process.uptime()), 'seconds');
}, 60000); // Every minute

// Cleanup on exit
process.on('exit', () => {
  clearInterval(keepAlive);
  console.log('Process exiting...');
});

module.exports = app;
console.log('🚀 Starting AaroCare backend with auth...');
console.log('📍 PORT:', process.env.PORT || 10000);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

console.log('✅ Basic modules loaded');

// Simple CORS
app.use(cors({
  origin: ['https://aarocare.netlify.app', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

console.log('✅ Middleware configured');

// Health routes
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'AaroCare server with auth running'
  });
});

app.get('/', (req, res) => {
  console.log('🏠 Root requested');
  res.status(200).json({ 
    status: 'OK', 
    message: 'AaroCare API with Auth',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'AaroCare API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

console.log('✅ Health routes added');

// Carefully add auth routes
try {
  console.log('📁 Loading auth routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
  
  // Fallback simple auth test endpoint
  app.post('/api/auth/test', (req, res) => {
    res.json({ 
      message: 'Auth endpoint reachable (fallback)',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ Fallback auth endpoint added');
}

console.log('🔍 Environment check:');
console.log(`  - PORT: ${PORT}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - AWS_REGION: ${process.env.AWS_REGION ? '✓' : '✗ MISSING'}`);
console.log(`  - COGNITO_USER_POOL_ID: ${process.env.COGNITO_USER_POOL_ID ? '✓' : '✗ MISSING'}`);
console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓' : '✗ MISSING'}`);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AaroCare server running on port ${PORT}`);
  console.log(`🌐 Backend URL: https://aarocare.onrender.com`);
  console.log('✅ Server started successfully');
});

console.log('✅ Server setup complete');

module.exports = app;
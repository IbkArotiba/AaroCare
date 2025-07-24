console.log('🚀 Starting ULTRA MINIMAL AaroCare backend...');
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

// Only health routes
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Ultra minimal server running'
  });
});

app.get('/', (req, res) => {
  console.log('🏠 Root requested');
  res.status(200).json({ 
    status: 'OK', 
    message: 'AaroCare Ultra Minimal API',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'AaroCare API',
    timestamp: new Date().toISOString()
  });
});

// Simple test auth endpoint (no complex routing)
app.post('/api/auth/test', (req, res) => {
  res.json({ 
    message: 'Auth endpoint reachable',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Simple routes added');

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ultra minimal server running on port ${PORT}`);
  console.log('✅ Server started successfully - NO ROUTE CONFLICTS');
});

console.log('✅ Server setup complete');

module.exports = app;
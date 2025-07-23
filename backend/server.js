console.log('🚀 Starting AaroCare backend...');
console.log('📍 PORT:', process.env.PORT || 5001);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

// server.js - Your main backend server file
const express = require('express');
const http = require('http');
const cors = require('cors');

console.log('✅ Basic modules loaded successfully');

const app = express();

// Add health check route FIRST (before any middleware)
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

// CORS configuration - explicitly include Netlify domain
app.use(cors({
  origin: ['https://aarocare.netlify.app', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

console.log('✅ Middleware configured');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Test if routes can be loaded
try {
  console.log('📁 Loading routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
  
  app.use('/api/patients', require('./routes/patients'));
  console.log('✅ Patients routes loaded');
  
  app.use('/api/statistics', require('./routes/statistics'));
  console.log('✅ Statistics routes loaded');
  
  app.use('/api/vitals', require('./routes/vitals'));
  console.log('✅ Vitals routes loaded');
  
  app.use('/api/notes', require('./routes/notes'));
  console.log('✅ Notes routes loaded');
  
  app.use('/api/care-teams', require('./routes/careTeam'));
  console.log('✅ Care team routes loaded');
  
  app.use('/api/treatment-plans', require('./routes/treatment'));
  console.log('✅ Treatment routes loaded');
  
  app.use('/api/users', require('./routes/users'));
  console.log('✅ User routes loaded');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  // Continue anyway - some routes might work
}

// Create HTTP server
const server = http.createServer(app);
console.log('✅ HTTP server created');

// Try to load Socket.IO (but don't fail if it doesn't work)
let socketServer = null;
try {
  const SocketServer = require('./sockets/socketServer');
  socketServer = new SocketServer(server);
  socketServer.start();
  console.log('✅ Socket.IO server initialized');
} catch (error) {
  console.error('⚠️ Socket.IO failed to load:', error.message);
  console.log('📍 Continuing without Socket.IO...');
}

// Additional API routes (only if socketServer loaded)
if (socketServer) {
  // Test route to send alerts
  app.post('/api/test-alert', (req, res) => {
    try {
      const { priority = 'high', message, department = 'general' } = req.body;
      
      const alertData = {
        id: Date.now(),
        priority: priority,
        message: message || `Test ${priority} alert - ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString(),
        department: department,
        read: false
      };
      
      if (priority === 'critical') {
        socketServer.sendCriticalAlert(alertData);
      } else {
        socketServer.sendDepartmentAlert(department, alertData);
      }
      
      console.log(`📢 Sent ${priority} alert to ${department} department:`, alertData.message);
      
      res.json({ 
        success: true, 
        message: 'Alert sent successfully',
        alertData: alertData
      });
    } catch (error) {
      console.error('Error sending test alert:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send alert' 
      });
    }
  });

  // Get online users endpoint
  app.get('/api/online-users', (req, res) => {
    try {
      const onlineUsers = socketServer.getOnlineUsers();
      res.json({ 
        success: true, 
        count: onlineUsers.length,
        users: onlineUsers 
      });
    } catch (error) {
      res.json({ success: true, count: 0, users: [] });
    }
  });
}

// Enhanced health check with socket info
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    socketConnections: socketServer ? socketServer.connectedUsers?.size || 0 : 0,
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Environment check and database test
const PORT = process.env.PORT || 5001;

console.log('🔍 Environment check:');
console.log(`  - PORT: ${PORT}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - AWS_REGION: ${process.env.AWS_REGION ? '✓' : '✗ MISSING'}`);
console.log(`  - COGNITO_USER_POOL_ID: ${process.env.COGNITO_USER_POOL_ID ? '✓' : '✗ MISSING'}`);
console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓' : '✗ MISSING'}`);

// Test database connection (but don't block startup)
try {
  const db = require('./config/database');
  db.query('SELECT 1 as test')
    .then(() => console.log('✅ Database connection successful'))
    .catch(err => console.error('⚠️ Database connection failed:', err.message));
} catch (error) {
  console.error('⚠️ Database module failed to load:', error.message);
}

// Start server
try {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.frontend_url || 'http://localhost:3000'}`);
    console.log(`🔌 Socket.IO: ${socketServer ? 'Ready' : 'Disabled'}`);
    console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Export for testing purposes
module.exports = { app, server, socketServer };
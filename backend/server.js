console.log('🚀 Starting AaroCare backend with auth...');
console.log('📍 PORT:', process.env.PORT || 10000);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

const http = require('http');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

console.log('✅ Basic modules loaded');

app.use(cors({
  origin: ['https://aarocare.netlify.app', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

console.log('✅ Middleware configured');

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

try {
  console.log('📁 Loading routes...');
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded successfully');

  app.use('/api/patients', require('./routes/patients'));
  console.log('✅ Patients routes loaded successfully');

  app.use('/api/vitals', require('./routes/vitals'));
  console.log('✅ Vitals routes loaded successfully');

  app.use('/api/notes', require('./routes/notes'));
  console.log('✅ Notes routes loaded successfully');

  app.use('/api/statistics', require('./routes/statistics'));
  console.log('✅ Statistics routes loaded successfully');

  app.use('/api/care-teams', require('./routes/careTeam'));
  console.log('✅ Care team routes loaded successfully');

  app.use('/api/treatment-plans', require('./routes/treatment'));
  console.log('✅ Treatment routes loaded successfully');

  app.use('/api/users', require('./routes/users'));
  console.log('✅ User routes loaded successfully');

} catch (error) {
  console.error('❌ Routes failed:', error.message);
  
  app.post('/api/test', (req, res) => {
    res.json({ 
      message: 'Endpoint reachable (fallback)',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ Fallback endpoint added');
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

if (socketServer) {
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

console.log('🔍 Environment check:');
console.log(`  - PORT: ${PORT}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - AWS_REGION: ${process.env.AWS_REGION ? '✓' : '✗ MISSING'}`);
console.log(`  - COGNITO_USER_POOL_ID: ${process.env.COGNITO_USER_POOL_ID ? '✓' : '✗ MISSING'}`);
console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓' : '✗ MISSING'}`);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AaroCare server running on port ${PORT}`);
  console.log(`🌐 Backend URL: https://aarocare.onrender.com`);
  console.log('✅ Server started successfully');
});

console.log('✅ Server setup complete');

module.exports = app;
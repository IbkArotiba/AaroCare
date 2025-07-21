// server.js - Your main backend server file
const express = require('express');
const http = require('http');
const cors = require('cors');
const SocketServer = require('./sockets/socketServer'); // Fixed path to the SocketServer file

const app = express();

// Middleware
app.use(cors({
  origin: process.env.frontend_url || 'http://localhost:3000', // Only allow specific origins with credentials
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Your existing routes and middleware here...
// For example:
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/care-teams', require('./routes/careTeam'));
app.use('/api/treatment-plans', require('./routes/treatment'));
app.use('/api/users', require('./routes/users'));
// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server with your SocketServer class
const socketServer = new SocketServer(server);
socketServer.start();

// Test route to send alerts (for testing real-time functionality)
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
    
    // Send alert based on priority
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

// Additional alert testing routes
app.post('/api/test-alert/critical', (req, res) => {
  const alertData = {
    id: Date.now(),
    priority: 'critical',
    message: 'CRITICAL: Patient in Room 204 needs immediate attention - Code Blue',
    timestamp: new Date().toISOString(),
    department: 'emergency',
    read: false
  };
  
  socketServer.sendCriticalAlert(alertData);
  console.log('🚨 CRITICAL ALERT sent to all users');
  
  res.json({ success: true, message: 'Critical alert sent to all users' });
});

app.post('/api/test-alert/department/:dept', (req, res) => {
  const department = req.params.dept;
  const { message } = req.body;
  
  const alertData = {
    id: Date.now(),
    priority: 'high',
    message: message || `Alert for ${department} department - Patient needs attention`,
    timestamp: new Date().toISOString(),
    department: department,
    read: false
  };
  
  socketServer.sendDepartmentAlert(department, alertData);
  console.log(`📢 Alert sent to ${department} department`);
  
  res.json({ success: true, message: `Alert sent to ${department} department` });
});

// Get online users endpoint
app.get('/api/online-users', (req, res) => {
  const onlineUsers = socketServer.getOnlineUsers();
  res.json({ 
    success: true, 
    count: onlineUsers.length,
    users: onlineUsers 
  });
});

// Health check endpoint
// Basic root endpoint for Railway health checks
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'AaroCare API is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Health check passed' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    socketConnections: socketServer.connectedUsers.size
  });
});

// Start server
const PORT = process.env.PORT || 5001;

try {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.frontend_url || 'http://localhost:3000'}`);
    console.log(`🔌 Socket.IO server is ready for connections`);
    console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log some environment status for debugging
    console.log('✅ Environment variables loaded:');
    console.log(`  - AWS_REGION: ${process.env.AWS_REGION ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
    console.log(`  - frontend_url: ${process.env.frontend_url || 'default'}`);
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
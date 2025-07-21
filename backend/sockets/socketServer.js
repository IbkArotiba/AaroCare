// socketServer.js - SocketServer Class
const { Server } = require('socket.io');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

class SocketServer {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: 'http://localhost:3000', // Your React frontend URL
                credentials: true
            },
        });
        this.connectedUsers = new Map();
        
        // Initialize Cognito JWT verifier
        this.jwtVerifier = CognitoJwtVerifier.create({
            userPoolId: process.env.COGNITO_USER_POOL_ID || "us-east-2_v8z1UEuK2", // Extract from your token
            tokenUse: "access",
            clientId: process.env.COGNITO_CLIENT_ID || "3qss392inogb773i5103cu4inp", // Extract from your token
        });
    }

    setAuthentication() {
        this.io.use(async (socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            
            try {
                // Extract token if it has Bearer prefix
                const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
                
                // Verify Cognito JWT token
                const payload = await this.jwtVerifier.verify(tokenString);
                
                // Extract user information from Cognito token
                socket.userId = payload.sub || payload.username;
                socket.userRole = payload['custom:role'] || payload.role || 'doctor'; // Check custom attributes first
                socket.userDepartment = payload['custom:department'] || payload.department || 'general';
                socket.cognitoUsername = payload.username;
                
                console.log(`Socket authenticated: User ${socket.userId} (${socket.userRole}) from ${socket.userDepartment}`);
                next();
            } catch (error) {
                console.error('Socket authentication error:', error.message);
                next(new Error('Invalid or expired token'));
            }
        });
    }

    initializeSocket() {
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.userId} (${socket.userRole}) connected`);
            
            // Store user info
            this.connectedUsers.set(socket.userId, {
                socketId: socket.id,
                role: socket.userRole,
                department: socket.userDepartment,
                connectedAt: new Date()
            });
            
            // Auto-join user to their role and department rooms
            socket.join(`role_${socket.userRole}`);
            socket.join(`dept_${socket.userDepartment}`);
            
            // Handle manual department joining (for admins who can see multiple departments)
            socket.on('joinDepartment', (department) => {
                if (['emergency', 'icu', 'surgery', 'pediatrics', 'general'].includes(department)) {
                    socket.join(`dept_${department}`);
                    console.log(`User ${socket.userId} joined ${department} department`);
                }
            });
            
            // Handle alert acknowledgment
            socket.on('acknowledgeAlert', (data) => {
                console.log(`Alert ${data.alertId} acknowledged by user ${socket.userId}`);
                // Broadcast to all users that this alert was acknowledged
                this.io.emit('alertAcknowledged', {
                    alertId: data.alertId,
                    acknowledgedBy: socket.userId,
                    acknowledgedAt: new Date()
                });
            });
            
            // Handle user status updates
            socket.on('updateStatus', (status) => {
                if (this.connectedUsers.has(socket.userId)) {
                    this.connectedUsers.get(socket.userId).status = status;
                    // Broadcast status update to relevant users
                    socket.to(`role_${socket.userRole}`).emit('userStatusUpdate', {
                        userId: socket.userId,
                        status: status
                    });
                }
            });
            
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`User ${socket.userId} disconnected`);
                this.connectedUsers.delete(socket.userId);
            });
        });
    }

    // Send alert to specific department
    sendDepartmentAlert(department, alertData) {
        console.log(`Sending alert to department: ${department}`);
        this.io.to(`dept_${department}`).emit('newAlert', alertData);
    }
    
    // Send alert to specific role (all doctors, all nurses, etc.)
    sendRoleAlert(role, alertData) {
        console.log(`Sending alert to role: ${role}`);
        this.io.to(`role_${role}`).emit('newAlert', alertData);
    }
    
    // Send critical alert to everyone
    sendCriticalAlert(alertData) {
        console.log('Sending CRITICAL alert to all users');
        this.io.emit('newAlert', alertData);  // Changed from 'criticalAlert' to 'newAlert'
    }
    
    // Send alert to specific user
    sendUserAlert(userId, alertData) {
        const user = this.connectedUsers.get(userId);
        if (user) {
            console.log(`Sending alert to user: ${userId}`);
            this.io.to(user.socketId).emit('newAlert', alertData);
        } else {
            console.log(`User ${userId} not found or not connected`);
        }
    }
    
    // Get list of online users
    getOnlineUsers() {
        return Array.from(this.connectedUsers.values());
    }

    // Start the socket server
    start() {
        this.setAuthentication();
        this.initializeSocket();
        console.log('Socket.IO server started and ready for connections');
    }
}

module.exports = SocketServer;
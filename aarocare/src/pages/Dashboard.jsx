import React from 'react';
import '@/pages/Dashboard.css';
import { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { io } from 'socket.io-client';
import AlertForm from '@/components/alerts/AlertForm';
import { useNavigate } from 'react-router-dom';
import AdminRegistration from '@/components/auth/AdminRegistration';
import { useAuth } from '@/contexts/AuthContext';

// Alert component - FIXED VERSION
const Alert = ({ priority, message, timestamp, onDismiss, onAcknowledge, onViewDetails }) => {
  // Get styles based on priority
  const getStyle = () => {
    const alertPriority = priority || 'low';
    
    if (alertPriority === 'critical') {
      return { bgcolor: '#ff3b30', color: 'white', icon: '🔴' };
    }
    if (alertPriority === 'high') {
      return { bgcolor: '#ff9500', color: 'white', icon: '🟠' };
    }
    if (alertPriority === 'medium') {
      return { bgcolor: '#ffcc00', color: '#333', icon: '🟡' };
    }
    if (alertPriority === 'low') {
      return { bgcolor: '#34c759', color: 'white', icon: '🟢' };
    }
    return { bgcolor: '#34c759', color: 'white', icon: '🟢' }; // default
  };

  // Ensure style is always defined
  const style = getStyle();

  // Handle view details - extract patient ID if present
  const handleViewDetails = () => {
    const patientIdMatch = message.match(/Patient ID: (\d+)/);
    const patientId = patientIdMatch ? patientIdMatch[1] : null;
    
    if (patientId) {
      window.location.href = `/patients/${patientId}/notes`;
    } else {
      alert("No patient information available for this alert");
    }
    
    // Also call the parent's handler if provided
    if (onViewDetails) onViewDetails();
  };

  return (
    <div className={`alert-item alert-${priority}`} style={{ backgroundColor: style.bgcolor }}>
      <div className="alert-icon">{style.icon}</div>
      <div className="alert-content">
        <div className="alert-message">{message}</div>
        <div className="alert-timestamp">{timestamp}</div>
      </div>
      <div className="alert-actions">
        {onAcknowledge && (
          <button className="alert-btn acknowledge" onClick={onAcknowledge}>
            Acknowledge
          </button>
        )}
        <button className="alert-btn view" onClick={handleViewDetails}>
          Details
        </button>
        {onDismiss && (
          <button className="alert-btn dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  // Existing state
  const [patients, setPatients] = useState(0);
  const [admissions, setAdmissions] = useState(0);
  const [discharges, setDischarges] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { user } = useAuth();
  
  // Socket.IO state - ADDED
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  const handleAddAlert = (newAlert) => {
    setAlerts(prevAlerts => [newAlert, ...prevAlerts]);
    if (socket && socket.connected) {
      socket.emit('newAlert', newAlert);
    }

  }
  // Alerts state
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      priority: 'critical',
      message: 'Patient John Doe needs immediate attention - Heart rate 140 BPM',
      timestamp: '2 minutes ago',
      read: false,
    },
    {
      id: 2,
      priority: 'high',
      message: 'Medication alert: Patient Jane Smith missed scheduled dose',
      timestamp: '15 minutes ago',
      read: false,
    },
    {
      id: 3,
      priority: 'medium',
      message: 'Lab results ready for patient Robert Johnson',
      timestamp: '1 hour ago',
      read: false,
    },
    {
      id: 4,
      priority: 'low',
      message: 'New patient admitted to Ward B',
      timestamp: '3 hours ago',
      read: true,
    },
  ]);
  
  // Alert handlers
  const handleDismissAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };
  
  const handleAcknowledgeAlert = (alertId) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
    
    if (socket) {
      socket.emit('acknowledgeAlert', { alertId });
    }
  };
  
  const handleViewAlertDetails = (alertId) => {
    console.log(`View details for alert ${alertId}`);
    handleAcknowledgeAlert(alertId);
  };
  
  // Fetch statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
       
      const [patientsRes, admissionsRes, dischargesRes, criticalRes] = await Promise.all([
        apiClient.get('/api/statistics/patients/total'),
        apiClient.get('/api/statistics/patients/admissions'),
        apiClient.get('/api/statistics/patients/discharged'),
        apiClient.get('/api/statistics/patients/critical')   
      ]);
      
      setPatients(patientsRes.data.total || 0);
      setAdmissions(admissionsRes.data.admissions || 0);
      setDischarges(dischargesRes.data.discharged || 0);
      setCriticalAlerts(criticalRes.data.critical || 0);
      
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
      setError('Failed to load dashboard data. Please make sure you are logged in.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchStats();
  };
  
  const navigate = useNavigate();

  const navigateToPatientList = () => {
    navigate('/patients');
  };

  const navigateToPatientForm = () => {
    navigate('/patients/form');
  };

  const navigateToPatientDetail = () => {
    navigate('/patients/:id/Details');
  };

  const navigateToCareTeam = () => {
    navigate('/patients/:id/care-team');
  };

  const navigateToVitalsHistory = () => {
    navigate('/patients/:id/vitals');
  };

  const navigateToNotesList = () => {
    navigate('/patients/:id/notes');
  };

  const navigateToTreatmentPlan = () => {
    navigate('/patients/:id/treatment');
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();
    
    // SOCKET.IO CONNECTION - STEP 4
    const connectSocket = () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping socket connection');
        setConnectionStatus('No Auth Token');
        return null;
      }

      console.log('Connecting to socket with token:', token.substring(0, 10) + '...');
      
      const newSocket = io('https://aarocare.onrender.com', {
        auth: { 
          token: token.startsWith('Bearer ') ? token : `Bearer ${token}`
        }
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server');
        setConnectionStatus('Connected');
        setSocket(newSocket);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setConnectionStatus('Connection Failed');
      });

      newSocket.on('newAlert', (alertData) => {
        console.log('🚨 New real-time alert received:', alertData);
        
        const newAlert = {
          id: Date.now(),
          priority: alertData.priority || 'medium',
          message: alertData.message || 'New alert received',
          timestamp: 'Just now',
          read: false,
        };
        
        setAlerts(currentAlerts => [newAlert, ...currentAlerts.slice(0, 15)]);
        
        // Play sound for critical alerts
        if (alertData.priority === 'critical') {
          console.log('🔊 CRITICAL ALERT - Sound would play here');
        }
      });

      newSocket.on('alertAcknowledged', (data) => {
        console.log('✅ Alert acknowledged by another user:', data);
        setAlerts(currentAlerts => 
          currentAlerts.map(alert => 
            alert.id === data.alertId ? { ...alert, read: true } : alert
          )
        );
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from Socket.IO server');
        setConnectionStatus('Disconnected');
      });

      return newSocket;
    };

    const socketInstance = connectSocket();
    
    // Set up automatic refresh
    const statsRefreshInterval = setInterval(() => {
      fetchStats();
    }, 60000);
    
    // Demo alert interval (reduced frequency since we have real-time now)
    const alertInterval = setInterval(() => {
      const priorities = ['low', 'medium', 'high', 'critical'];
      const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
      const newAlert = {
        id: Date.now(),
        priority: randomPriority,
        message: `Demo ${randomPriority} priority alert`,
        timestamp: 'Just now',
        read: false,
      };
      
      setAlerts(currentAlerts => [newAlert, ...currentAlerts.slice(0, 8)]);
      
      if (randomPriority === 'critical') {
        console.log('CRITICAL ALERT - Sound would play here');
      }
    }, 600000); // Reduced to every 10 minutes
    
    // Cleanup
    return () => {
      clearInterval(alertInterval);
      clearInterval(statsRefreshInterval);
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <div className="dashboard-controls">
          <span className="last-updated">Last updated: {lastUpdate.toLocaleTimeString()}</span> <br />
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded" onClick={handleRefresh}>
          Refresh Data
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" onClick={navigateToPatientList}>
          View Patient List
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" onClick={navigateToPatientForm}>
            Add New Patient
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" onClick={navigateToPatientDetail}>
            View Patient Details
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" onClick={navigateToCareTeam}>
            View Care Team
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" onClick={navigateToVitalsHistory}>
            View Vitals History
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" onClick={navigateToNotesList}> 
            View Notes List
          </button> 
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" onClick={navigateToTreatmentPlan}> 
            View Treatment Plan
          </button>
          {user && user.role === 'admin' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Admin Actions</h3>
              <button 
                onClick={() => navigate('/admin/register')}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center gap-2"
              >
              Register New Staff Member
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Socket Connection Status */}
      <div className="connection-status" style={{ 
        padding: '10px', 
        backgroundColor: connectionStatus === 'Connected' ? '#d4edda' : '#f8d7da',
        color: connectionStatus === 'Connected' ? '#155724' : '#721c24',
        border: '1px solid',
        borderColor: connectionStatus === 'Connected' ? '#c3e6cb' : '#f5c6cb',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        🔌 Socket Status: {connectionStatus}
      </div>
      
      {loading && <p className="loading-message">Loading dashboard data...</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="stats-grid">
        <div className="stat-card">
          <h2>Patients Today</h2>
          <p className="stat-number">{patients}</p>
        </div>
        <div className="stat-card">
          <h2>Admissions</h2>
          <p className="stat-number">{admissions}</p>
        </div> 
        <div className="stat-card">
          <h2>Discharges</h2>
          <p className="stat-number">{discharges}</p>
        </div>
        <div className="stat-card">
          <h2>Critical Alerts</h2>
          <p className="stat-number">{criticalAlerts}</p>
        </div>
      </div>
      
      <div className="alerts-section">
        <h2 className="section-title">
          Alerts
          <span className="alert-badge">
            {alerts.filter(alert => !alert.read).length}
          </span>
        </h2>
        <div className="alerts-container">
          {alerts.length === 0 ? (
            <p className="no-alerts">No alerts at this time.</p>
          ) : (
            alerts.map(alert => (
              <Alert
                key={alert.id}
                priority={alert.priority}
                message={alert.message}
                timestamp={alert.timestamp}
                onDismiss={() => handleDismissAlert(alert.id)}
                onAcknowledge={() => handleAcknowledgeAlert(alert.id)}
                onViewDetails={() => handleViewAlertDetails(alert.id)}
              />
            ))
          )}
        </div>
        <AlertForm onSubmit={handleAddAlert}/>
      </div>
      
      <div className="recent-activity">
        <h2 className="section-title">Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <p><strong>Dr. Smith</strong> updated patient chart for <strong>John Doe</strong></p>
            <span>2 hours ago</span>
          </div>
          <div className="activity-item">
            <p><strong>Nurse Johnson</strong> administered medication to <strong>Jane Smith</strong></p>
            <span>3 hours ago</span>
          </div>
          <div className="activity-item">
            <p><strong>Dr. Wilson</strong> created a new treatment plan</p>
            <span>5 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
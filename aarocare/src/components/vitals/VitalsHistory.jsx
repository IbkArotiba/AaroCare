import React, { useState, useEffect } from 'react';
import { RefreshCw, PlusCircle, AlertCircle, Heart, Thermometer, Activity, BarChart2, Search, Filter, TrendingUp, Users, Clock } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';

const VitalsHistory = ({ patientId }) => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [newVitals, setNewVitals] = useState({
    patient_id: patientId || '',
    temperature: '',
    heart_rate: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    pain_level: '0'
  });

  // Determine status based on vitals - moved up before fetchVitals
  const determineStatus = (vitals) => {
    const criticalConditions = [
      parseFloat(vitals.temperature) > 38.0 || parseFloat(vitals.temperature) < 36.0,
      parseFloat(vitals.heart_rate) > 110 || parseFloat(vitals.heart_rate) < 50,
      parseFloat(vitals.blood_pressure_systolic) > 160 || parseFloat(vitals.blood_pressure_systolic) < 80,
      parseFloat(vitals.oxygen_saturation) < 92,
      parseInt(vitals.pain_level) >= 7
    ];

    const warningConditions = [
      parseFloat(vitals.temperature) > 37.5 || parseFloat(vitals.temperature) < 36.1,
      parseFloat(vitals.heart_rate) > 100 || parseFloat(vitals.heart_rate) < 60,
      parseFloat(vitals.blood_pressure_systolic) > 140,
      parseFloat(vitals.oxygen_saturation) < 95,
      parseInt(vitals.pain_level) >= 4
    ];

    if (criticalConditions.some(condition => condition)) return 'critical';
    if (warningConditions.some(condition => condition)) return 'warning';
    return 'stable';
  };

  const fetchVitals = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (patientId) {
        console.log(`Fetching vitals for patient ${patientId}`);
        response = await apiClient.get(`/api/patients/${patientId}/vitals`);
        console.log("Patient-specific vitals data:", response.data);
      } else {
        console.log("Fetching all vitals");
        response = await apiClient.get(`/api/vitals`);
        console.log("All vitals data:", response.data);
      }
      
      // Calculate vital signs status for each record
      const vitalsWithStatus = response.data.map(vital => ({
        ...vital,
        vital_status: determineStatus(vital) // Add calculated status
      }));
      
      setVitals(vitalsWithStatus);
      
      // Always fetch users for the form
      const [usersResponse] = await Promise.all([
        apiClient.get(`/api/users`),
      ]);
      
      console.log("Users data:", usersResponse.data);
      setUsers(usersResponse.data);
      
    } catch (error) {
      console.error('Error fetching vitals:', error);
      setError('Failed to load vitals. Please make sure you are logged in.');
      setVitals([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await apiClient.get('/api/patients');
      console.log("Patients data:", response.data);
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  };

  // Filter vitals based on search and status
  const filteredVitals = vitals.filter(vital => {
    const matchesSearch = (vital.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vital.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vital.medical_record_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || vital.vital_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Get statistics using calculated vital_status
  const stats = {
    total: vitals.length,
    critical: vitals.filter(v => v.vital_status === 'critical').length,
    warning: vitals.filter(v => v.vital_status === 'warning').length,
    stable: vitals.filter(v => v.vital_status === 'stable').length
  };

  // Check if vital sign is abnormal
  const isAbnormal = (type, value) => {
    if (!value) return false;
    
    const thresholds = {
      temperature: { low: 36.1, high: 37.2 },
      heart_rate: { low: 60, high: 100 },
      blood_pressure_systolic: { low: 90, high: 140 },
      blood_pressure_diastolic: { low: 60, high: 90 },
      respiratory_rate: { low: 12, high: 20 },
      oxygen_saturation: { low: 95, high: 100 }
    };
    
    if (!thresholds[type]) return false;
    
    const val = parseFloat(value);
    return val < thresholds[type].low || val > thresholds[type].high;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'stable': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Refresh data
  const handleRefresh = () => {
    fetchVitals();
  };

  const handleAddVitals = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    
    if (!newVitals.temperature || !newVitals.heart_rate || !newVitals.blood_pressure_systolic || 
        !newVitals.blood_pressure_diastolic || !newVitals.respiratory_rate || !newVitals.oxygen_saturation) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      console.log('Saving vitals for patient:', selectedPatient);
      console.log('Vitals data:', newVitals);
      
      // Actually save to database via API
      const response = await apiClient.post(`/api/vitals/patients/${selectedPatient}/vitals`, newVitals);
      console.log('Save response:', response);
      
      // Then refresh the data from server
      await fetchVitals();
      
      toast.success('Vitals saved successfully');
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving vitals:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to save vitals: ${error.response?.data?.message || error.message}`);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewVitals({
      patient_id: '',
      temperature: '',
      heart_rate: '',
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      pain_level: '0'
    });
    setSelectedPatient('');
  };

  useEffect(() => {
    // Initial load
    fetchVitals();
    fetchPatients();
    
    // Update new member form if patientId changes
    setNewVitals(prev => ({
      ...prev,
      patient_id: patientId || ''
    }));
  }, [patientId]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vital Signs Monitor</h1>
          <p className="text-gray-600">Real-time patient vital signs dashboard</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            <PlusCircle className="w-4 h-4" />
            Record Vitals
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Records</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.critical}</p>
              <p className="text-sm text-gray-600">Critical</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.warning}</p>
              <p className="text-sm text-gray-600">Warning</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.stable}</p>
              <p className="text-sm text-gray-600">Stable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="stable">Stable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Vitals Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <h3 className="text-lg font-semibold mb-4">Record New Vital Signs</h3>
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Patient
                </label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full border rounded-md p-2"
                  required
                >
                  <option value="">Choose a patient...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newVitals.temperature}
                    onChange={(e) => setNewVitals({...newVitals, temperature: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="36.5"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    value={newVitals.heart_rate}
                    onChange={(e) => setNewVitals({...newVitals, heart_rate: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="72"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={newVitals.blood_pressure_systolic}
                    onChange={(e) => setNewVitals({...newVitals, blood_pressure_systolic: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="120"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={newVitals.blood_pressure_diastolic}
                    onChange={(e) => setNewVitals({...newVitals, blood_pressure_diastolic: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="80"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Respiratory Rate
                  </label>
                  <input
                    type="number"
                    value={newVitals.respiratory_rate}
                    onChange={(e) => setNewVitals({...newVitals, respiratory_rate: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="16"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Oxygen Saturation (%)
                  </label>
                  <input
                    type="number"
                    value={newVitals.oxygen_saturation}
                    onChange={(e) => setNewVitals({...newVitals, oxygen_saturation: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="98"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pain Level: {newVitals.pain_level}/10
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={newVitals.pain_level}
                  onChange={(e) => setNewVitals({...newVitals, pain_level: e.target.value})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 - No Pain</span>
                  <span>5 - Moderate</span>
                  <span>10 - Severe</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="border border-gray-300 bg-white text-gray-700 py-2 px-4 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddVitals}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
                >
                  Save Vitals
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-lg font-medium text-gray-900">Current Vital Signs</h3>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Updating vital signs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-4 h-4" />
                      Temp
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      HR
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      BP
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <BarChart2 className="w-4 h-4" />
                      O₂
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Time
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVitals.map((vital) => (
                  <tr key={vital.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{vital.first_name} {vital.last_name}</div>
                      <div className="text-sm text-gray-500">ID: {vital.patient_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{vital.room_number}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${
                      isAbnormal('temperature', vital.temperature) ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {vital.temperature}°C
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${
                      isAbnormal('heart_rate', vital.heart_rate) ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {vital.heart_rate}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${
                      isAbnormal('blood_pressure_systolic', vital.blood_pressure_systolic) || 
                      isAbnormal('blood_pressure_diastolic', vital.blood_pressure_diastolic) ? 
                      'text-red-600' : 'text-gray-900'
                    }`}>
                      {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${
                      isAbnormal('respiratory_rate', vital.respiratory_rate) ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {vital.respiratory_rate}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${
                      isAbnormal('oxygen_saturation', vital.oxygen_saturation) ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {vital.oxygen_saturation}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        vital.pain_level >= 7 ? 'bg-red-100 text-red-800' :
                        vital.pain_level >= 4 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {vital.pain_level}/10
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vital.vital_status)}`}>
                        {vital.vital_status.charAt(0).toUpperCase() + vital.vital_status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatTime(vital.recorded_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredVitals.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No vital signs found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalsHistory;
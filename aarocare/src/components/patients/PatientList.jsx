import React, { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { Search } from 'lucide-react';
const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/patients');
      console.log('Patient data received:', response.data);
      
      // If we get here, we have data even if the audit logging failed
      if (Array.isArray(response.data)) {
        setPatients(response.data);
        setLastUpdate(new Date());
      } else {
        console.warn('Response data is not an array:', response.data);
        setPatients([]);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(`Failed to load patients: ${err.message}`);
      
      // Try to use any partial data that might have been returned
      if (err.response?.data?.rows && Array.isArray(err.response.data.rows)) {
        setPatients(err.response.data.rows);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch on component mount and when retry count changes
  useEffect(() => {
    fetchPatients();
  }, [retryCount]);
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.medical_record_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  

  return (
    <div className="patient-list-container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Patient List</h1>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-4">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button 
            onClick={handleRetry}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, MRN, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="discharged">Discharged</option>
            </select>
          </div>
        </div>
      </div>
    
      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-600">Loading patients...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          {patients.length > 0 && (
            <p className="mt-2 text-sm">Showing cached data. Click refresh to try again.</p>
          )}
        </div>
      )}
      
      {!loading && !error && patients.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>No patients found.</p>
        </div>
      )}
      
      {patients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 border-b text-left">ID</th>
                <th className="py-3 px-4 border-b text-left">Name</th>
                <th className="py-3 px-4 border-b text-left">MRN</th>
                <th className="py-3 px-4 border-b text-left">Room</th>
                <th className="py-3 px-4 border-b text-left">Status</th>
                <th className="py-3 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient, index) => (
                <tr key={patient.id || index} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{patient.id || 'N/A'}</td>
                  <td className="py-3 px-4 border-b">
                    {patient.first_name || ''} {patient.last_name || ''}
                  </td>
                  <td className="py-3 px-4 border-b">{patient.medical_record_number || 'N/A'}</td>
                  <td className="py-3 px-4 border-b">{patient.room_number || 'N/A'}</td>
                  <td className="py-3 px-4 border-b">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      patient.status === 'Critical' ? 'bg-red-100 text-red-800' :
                      patient.status === 'Stable' || patient.status === 'active' ? 'bg-green-100 text-green-800' :
                      patient.status === 'discharged' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {patient.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PatientList;
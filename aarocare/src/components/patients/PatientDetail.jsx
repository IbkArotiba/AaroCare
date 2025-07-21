import React, { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext'; 
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Calendar,
  AlertCircle,
  CheckCircle, 
  XCircle,
  Edit,
  Eye,
  Download,
  Users,
  Activity,
  Bed
} from 'lucide-react';

const PatientTab = () => {
  const [socket, setSocket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [patients, setPatients] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [vitals, setVitals] = useState([]);
  const [careTeams, setCareTeams] = useState([]);
  
  // Fetch statistics (if needed)
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.get('/api/patients');
      setPatients(response.data);
      const response2 = await apiClient.get('/api/vitals');
      setVitals(response2.data);
      const response3 = await apiClient.get('/api/care-teams');
      setCareTeams(response3.data);
      
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching patient statistics:', err);
      setError('Failed to load patient statistics. Please make sure you are logged in.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchStats();
  };
  
  useEffect(() => {
    fetchStats();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Activity className="w-4 h-4" />;
      case 'discharged': return <XCircle className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.medical_record_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.primary_diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const PatientCard = ({ patient }) => {
    const patientVitals = vitals.find(vital => vital.patient_id === patient.id) || {};
    const patientCareTeam = careTeams.filter(careTeam => careTeam.patient_id === patient.id);
    const primaryCareTeam = patientCareTeam.find(ct => ct.role_in_care === 'Primary_doctor') || patientCareTeam[0];    
    return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
          {patient.first_name.charAt(0).toUpperCase() + patient.last_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{patient.first_name} {patient.last_name}</h3>
            <p className="text-sm text-gray-500">{patient.medical_record_number} • {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}y {patient.gender}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
            {getStatusIcon(patient.status)}
            <span className="ml-1 capitalize">{patient.status}</span>
          </span>
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div> 
      </div>

      {/* Room & Diagnosis */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Bed className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Room {patient.room_number}-{patient.bed_number}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{patient.primary_diagnosis}</span>
        </div>
      </div>

      {/* Vitals */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Latest Vitals</span>
          <span className="text-xs text-gray-400">{new Date(patientVitals.timestamp || Date.now()).toLocaleTimeString()}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.blood_pressure_systolic || '-'}/{patientVitals.blood_pressure_diastolic || '-'}</div>
            <div className="text-gray-500">BP</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.heart_rate || '-'}</div>
            <div className="text-gray-500">HR</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.respiratory_rate || '-'}</div>
            <div className="text-gray-500">RR</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.temperature || '-'}</div>
            <div className="text-gray-500">Temp</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.oxygen_saturation || '-'}</div>
            <div className="text-gray-500">SpO2</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.weight || '-'}</div>
            <div className="text-gray-500">Weight</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.height || '-'}</div>
            <div className="text-gray-500">Height</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{patientVitals.pain_level || '-'}</div>
            <div className="text-gray-500">Pain</div>
          </div>
        </div>
      </div>

      {/* Contact & Doctor */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Admitted {patient.admission_date}</span>
        </div>
      </div>

      {/* Allergies */}
      {patient.allergies && patient.allergies.length > 0 && (

        <div className="mb-4">
          <div className="flex items-center space-x-1 mb-1">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-orange-600">Allergies</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {patient.allergies.map((allergy, index) => (
              <span key={index} className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded">
                {allergy}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-100">
        <button className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          <Eye className="w-4 h-4 mr-1" />
          View
        </button>
        <button className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
          <Edit className="w-4 h-4" />
        </button>
        <button className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {filteredPatients.length} Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
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


        {/* Patient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map(patient => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>

        {/* Empty State */}
        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No patients found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding your first patient.'}
            </p>
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientTab;  
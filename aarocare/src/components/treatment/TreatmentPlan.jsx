import React, { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext'; 
import { toast } from 'react-hot-toast';
import { RefreshCw, PlusCircle, AlertCircle, FileText, Calendar, Pill, Activity, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';


const TreatmentPlanPage = ({ patientId }) => {
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [patients, setPatients] = useState([]);
  
  const [newPlan, setNewPlan] = useState({
    patient_id: patientId || '',
    diagnosis: '',
    treatment_goals: '',
    medications: [{ name: '', dosage: '', frequency: '' }],
    procedures: [{ name: '', scheduled: '' }],
    dietary_restrictions: '',
    activity_level: '',
    follow_up_instructions: '',
    estimated_discharge_date: ''
  });

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (patientId) {
        console.log(`Fetching treatment plans for patient ${patientId}`);
        response = await apiClient.get(`/api/patients/${patientId}/treatment-plans`);
        console.log("Patient-specific treatment plans data:", response.data);
      } else {
        console.log("Fetching all treatment plans");
        response = await apiClient.get(`/api/treatment-plans`);
        console.log("All treatment plans data:", response.data);
      }

      setTreatmentPlans(response.data);
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
      setError('Failed to load treatment plans. Please make sure you are logged in.');
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

  const deletePlan = async (planId, patientId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this plan?')) {
        return;
      }
      
      await apiClient.delete(`/api/treatment-plans/patients/${patientId}/treatment/${planId}`);
      toast.success('Plan deleted successfully');
      fetchPlans(); // Refresh plans list
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };
  
  // Filter plans based on status
  const filteredPlans = treatmentPlans.filter(plan => {
    return filterStatus === 'all' || plan.status === filterStatus;
  });

  // Get statistics
  const stats = {
    total: treatmentPlans.length,
    active: treatmentPlans.filter(p => p.status === 'active').length,
    completed: treatmentPlans.filter(p => p.status === 'completed').length,
    modified: treatmentPlans.filter(p => p.status === 'modified').length
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'modified': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Simulate refresh
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Add medication field
  const addMedication = () => {
    setNewPlan({
      ...newPlan,
      medications: [...newPlan.medications, { name: '', dosage: '', frequency: '' }]
    });
  };

  // Add procedure field
  const addProcedure = () => {
    setNewPlan({
      ...newPlan,
      procedures: [...newPlan.procedures, { name: '', scheduled: '' }]
    });
  };

  // Update medication
  const updateMedication = (index, field, value) => {
    const updatedMeds = [...newPlan.medications];
    updatedMeds[index][field] = value;
    setNewPlan({ ...newPlan, medications: updatedMeds });
  };

  // Update procedure
  const updateProcedure = (index, field, value) => {
    const updatedProcs = [...newPlan.procedures];
    updatedProcs[index][field] = value;
    setNewPlan({ ...newPlan, procedures: updatedProcs });
  };

  // Handle save treatment plan
  const handleSavePlan = async () => {
    try {
      const response = await apiClient.post(`/api/treatment-plans/patients/${newPlan.patient_id}/treatment`, {
        ...newPlan,
        status: 'active'
      });
      
      toast.success('Treatment plan created successfully');
      fetchPlans(); // Refresh from API
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating treatment plan:', error);
      toast.error('Failed to create treatment plan');
    }
  };

  // Reset form
  const resetForm = () => {
    setNewPlan({
      patient_id: '',
      diagnosis: '',
      treatment_goals: '',
      medications: [{ name: '', dosage: '', frequency: '' }],
      procedures: [{ name: '', scheduled: '' }],
      dietary_restrictions: '',
      activity_level: '',
      follow_up_instructions: '',
      estimated_discharge_date: ''
    });
  };

  // Update plan status
  const updatePlanStatus = (planId, newStatus) => {
    setTreatmentPlans(treatmentPlans.map(plan => 
      plan.id === planId 
        ? { ...plan, status: newStatus, updated_at: new Date().toISOString() }
        : plan
    ));
  };

  useEffect(() => {
      // Initial load
      fetchPlans();
      fetchPatients();
      
      setNewPlan(prev => ({
        ...prev,
        patient_id: patientId || ''
      }));
    }, [patientId]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Treatment Plans</h1>
          <p className="text-gray-600">Manage patient treatment plans and care protocols</p>
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
            New Plan
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Plans</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-blue-400" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Edit className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{stats.modified}</p>
              <p className="text-sm text-gray-600">Modified</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Plans</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="modified">Modified</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Add Treatment Plan Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Treatment Plan</h3>
            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Patient
                  </label>
                  <select
                    value={newPlan.patient_id}
                    onChange={(e) => setNewPlan({...newPlan, patient_id: e.target.value})}
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Discharge Date
                  </label>
                  <input
                    type="date"
                    value={newPlan.estimated_discharge_date}
                    onChange={(e) => setNewPlan({...newPlan, estimated_discharge_date: e.target.value})}
                    className="w-full border rounded-md p-2"
                  />
                </div>
              </div>

              {/* Diagnosis and Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Diagnosis
                </label>
                <input
                  type="text"
                  value={newPlan.diagnosis}
                  onChange={(e) => setNewPlan({...newPlan, diagnosis: e.target.value})}
                  className="w-full border rounded-md p-2"
                  placeholder="Enter primary diagnosis..."
                  required
                />
                
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treatment Goals
                </label>
                <textarea
                  value={newPlan.treatment_goals}
                  onChange={(e) => setNewPlan({...newPlan, treatment_goals: e.target.value})}
                  className="w-full border rounded-md p-2 h-20"
                  placeholder="Describe treatment goals..."
                  required
                />
              </div>

              {/* Medications */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Medications</label>
                  <button
                    type="button"
                    onClick={addMedication}
                    className="text-blue-600 text-sm hover:text-blue-800"
                  >
                    + Add Medication
                  </button>
                </div>
                {newPlan.medications.map((med, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Medication name"
                      value={med.name}
                      onChange={(e) => updateMedication(index, 'name', e.target.value)}
                      className="border rounded-md p-2"
                    />
                    <input
                      type="text"
                      placeholder="Dosage"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      className="border rounded-md p-2"
                    />
                    <input
                      type="text"
                      placeholder="Frequency"
                      value={med.frequency}
                      onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                      className="border rounded-md p-2"
                    />
                  </div>
                ))}
              </div>

              {/* Procedures */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Procedures</label>
                  <button
                    type="button"
                    onClick={addProcedure}
                    className="text-blue-600 text-sm hover:text-blue-800"
                  >
                    + Add Procedure
                  </button>
                </div>
                {newPlan.procedures.map((proc, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Procedure name"
                      value={proc.name}
                      onChange={(e) => updateProcedure(index, 'name', e.target.value)}
                      className="border rounded-md p-2"
                    />
                    <input
                      type="text"
                      placeholder="Schedule"
                      value={proc.scheduled}
                      onChange={(e) => updateProcedure(index, 'scheduled', e.target.value)}
                      className="border rounded-md p-2"
                    />
                  </div>
                ))}
              </div>

              {/* Other Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <textarea
                    value={newPlan.dietary_restrictions}
                    onChange={(e) => setNewPlan({...newPlan, dietary_restrictions: e.target.value})}
                    className="w-full border rounded-md p-2 h-20"
                    placeholder="Dietary guidelines..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Level
                  </label>
                  <textarea
                    value={newPlan.activity_level}
                    onChange={(e) => setNewPlan({...newPlan, activity_level: e.target.value})}
                    className="w-full border rounded-md p-2 h-20"
                    placeholder="Activity restrictions..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Instructions
                </label>
                <textarea
                  value={newPlan.follow_up_instructions}
                  onChange={(e) => setNewPlan({...newPlan, follow_up_instructions: e.target.value})}
                  className="w-full border rounded-md p-2 h-20"
                  placeholder="Follow-up care instructions..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
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
                onClick={handleSavePlan}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
              >
                Save Treatment Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Plans List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading treatment plans...</p>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{patients.find(p => p.id == plan.patient_id)?.first_name} {patients.find(p => p.id == plan.patient_id)?.last_name}</h3>
                    <p className="text-sm text-gray-600">Room {plan.room_number} • ID: {plan.patient_id}</p>
                    <p className="text-sm font-medium text-gray-800 mt-1">{plan.diagnosis}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(plan.status)}`}>
                      {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updatePlanStatus(plan.id, plan.status === 'active' ? 'completed' : 'active')}
                        className="p-2 text-gray-400 hover:text-green-600"
                        title={plan.status === 'active' ? 'Mark as completed' : 'Mark as active'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Edit plan"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                  onClick={() => deletePlan(plan.id, plan.patient_id)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                  aria-label="Delete note"
                  >
                  <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Treatment Goals */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Activity className="w-4 h-4 mr-1" />
                      Treatment Goals
                    </h4>
                    <p className="text-sm text-gray-600">{plan.treatment_goals}</p>
                  </div>

                  {/* Medications */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Pill className="w-4 h-4 mr-1" />
                      Medications
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.medications.map((med, index) => (
                        <li key={index}>
                          <span className="font-medium">{med.name}</span> {med.dosage} - {med.frequency}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Procedures */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Procedures
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.procedures.map((proc, index) => (
                        <li key={index}>
                          <span className="font-medium">{proc.name}</span> - {proc.scheduled}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Diet & Activity */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Diet & Activity</h4>
                    <p className="text-sm text-gray-600 mb-2"><strong>Diet:</strong> {plan.dietary_restrictions}</p>
                    <p className="text-sm text-gray-600"><strong>Activity:</strong> {plan.activity_level}</p>
                  </div>

                  {/* Follow-up */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Follow-up
                    </h4>
                    <p className="text-sm text-gray-600">{plan.follow_up_instructions}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Est. Discharge:</strong> {formatDate(plan.estimated_discharge_date)}
                    </p>
                  </div>

                  {/* Created Info */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Plan Details
                    </h4>
                    <p className="text-sm text-gray-600">Created by: {plan.created_by}</p>
                    <p className="text-sm text-gray-600">Created: {formatDate(plan.created_at)}</p>
                    <p className="text-sm text-gray-600">Updated: {formatDate(plan.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {filteredPlans.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No treatment plans found</p>
              <p className="text-sm">Create a new treatment plan to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentPlanPage;
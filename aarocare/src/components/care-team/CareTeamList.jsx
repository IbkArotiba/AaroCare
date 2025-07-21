import React, { useState, useEffect } from 'react';
import { Plus, X, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '@/services/apiClient';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';  

const CareTeam = ({ patientId }) => {
  // This would work with your real API in production
  const [careTeam, setCareTeam] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    user_id: '',
    patient_id: patientId || '',
    role_in_care: 'primary_nurse'
  });

  const roleLabels = {
    'primary_doctor': 'Primary Doctor',
    'consulting_doctor': 'Consulting Doctor',
    'primary_nurse': 'Primary Nurse',
    'nurse': 'Nurse'
  };

  // In real app, this would fetch from your API
  const fetchCareTeam = async () => {
    setLoading(true);
    setError(null);
    try {
        if (patientId) {
            console.log(`Fetching care team for patient ${patientId}`);
            const response = await apiClient.get(`/api/patients/${patientId}/care-team`);
            console.log("Patient-specific care team data:", response.data);
            // Filter out inactive members
            const activeMembers = response.data.filter(member => member.is_active);
            console.log("Active care team members:", activeMembers);
            setCareTeam(activeMembers);
        } else {
            console.log("Fetching all care teams");
            const response = await apiClient.get(`/api/care-teams`);
            console.log("All care teams data:", response.data);
            // Filter out inactive members
            const activeMembers = response.data.filter(member => member.is_active);
            console.log("Active care team members:", activeMembers);
            setCareTeam(activeMembers);
        }
        
        // Always fetch users and patients for the form
        const [usersResponse, patientsResponse] = await Promise.all([
            apiClient.get(`/api/users`),
            apiClient.get(`/api/patients`)
        ]);
        
        console.log("Users data:", usersResponse.data);
        console.log("Patients data:", patientsResponse.data);
        
        setUsers(usersResponse.data);
        setPatients(patientsResponse.data);
        
    } catch (error) {
        console.error('Error fetching care team:', error);
        setError('Failed to load care team. Please make sure you are logged in.');
        setCareTeam([]); // Set empty array on error
    } finally {
        setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!newMember.user_id) {
      toast.error('Please select a staff member');
      return;
    }
  
    if (!newMember.patient_id) {
      toast.error('Please select a patient');
      return;
    }
  
    // Find the selected user details
    const selectedUser = users.find(user => user.id === parseInt(newMember.user_id));
    
    if (!selectedUser) {
      toast.error('Invalid user selection');
      return;
    }
    
    // Find the selected patient details
    const selectedPatient = patients.find(patient => patient.id === parseInt(newMember.patient_id));
    
    if (!selectedPatient) {
      toast.error('Invalid patient selection');
      return;
    }
    
    // Use the patient ID from the form, not the prop
    const targetPatientId = newMember.patient_id;
    
    try {
      await apiClient.post(`/api/care-teams/patients/${targetPatientId}/care-team`, newMember);
      fetchCareTeam();
      toast.success('Care team member added successfully');
      setIsAddingMember(false);
      setNewMember({ 
        user_id: '', 
        patient_id: patientId || '',
        role_in_care: 'primary_nurse'
      });
    } catch (error) {
      console.error('Error adding care team member:', error);
      toast.error('Failed to add care team member');
    }
  };

  // Handle removing a team member
  const handleRemoveMember = async (careTeamId) => {
    if (!careTeamId) {
      toast.error('Invalid care team ID');
      return;
    }
    
    try {
        if (patientId) {
            // Use patient-specific endpoint
            await apiClient.delete(`/api/care-teams/patients/${patientId}/care-team/${careTeamId}`);
        } else {
            // Use general endpoint for removing members
            await apiClient.delete(`/api/care-teams/members/${careTeamId}`);
        }
        toast.success('Care team member removed successfully');
        fetchCareTeam(); // Refresh data from API
    } catch (error) {
      console.error('Error removing care team member:', error);
      toast.error('Failed to remove care team member');
    }
  };

  useEffect(() => {
    // Initial load
    fetchCareTeam();
    
    // Update new member form if patientId changes
    setNewMember(prev => ({
      ...prev,
      patient_id: patientId || ''
    }));
  }, [patientId]);

  // Add debugging
  console.log("Current careTeam state:", careTeam);
  console.log("careTeam length:", careTeam?.length);
  console.log("careTeam type:", typeof careTeam);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">
            {patientId ? 'Patient Care Team' : 'All Care Teams'}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={fetchCareTeam}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Refresh care team"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {!isAddingMember && (
              <button
                onClick={() => setIsAddingMember(true)}
                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span> Assign Care Team Member</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Show error if any */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Add new member form */}
      {isAddingMember && (
        <div className="p-4 border-b bg-gray-50">
          <form onSubmit={handleAddMember}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Member
                </label>
                <select
                  value={newMember.user_id}
                  onChange={(e) => setNewMember({...newMember, user_id: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  <option value="">Select Staff Member</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient
                </label>
                <select
                  value={newMember.patient_id}
                  onChange={(e) => setNewMember({...newMember, patient_id: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                  disabled={!!patientId} // Disable if patientId is provided
                >
                  <option value="">Select Patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} ({patient.primary_diagnosis})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role in Care
                </label>
                <select
                  value={newMember.role_in_care}
                  onChange={(e) => setNewMember({...newMember, role_in_care: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  <option value="primary_doctor">Primary Doctor</option>
                  <option value="consulting_doctor">Consulting Doctor</option>
                  <option value="primary_nurse">Primary Nurse</option>
                  <option value="nurse">Nurse</option>
                </select>
              </div>
            </div>
            
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="border border-gray-300 bg-white text-gray-700 py-1 px-4 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-4 rounded-md text-sm"
              >
                Assign Care Team Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Care team list */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading care team...</p>
          </div>
        ) : Array.isArray(careTeam) && careTeam.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  {!patientId && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Is Active</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {careTeam.map((careTeamMember, index) => (
                  <tr key={careTeamMember.care_team_id || careTeamMember.id || `care-team-${index}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {patientId 
                        ? `${careTeamMember.first_name || ''} ${careTeamMember.last_name || ''}`
                        : `${careTeamMember.staff_first_name || ''} ${careTeamMember.staff_last_name || ''}`}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {roleLabels[careTeamMember.role_in_care] || careTeamMember.role_in_care}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {patientId 
                        ? (careTeamMember.department || 'N/A')
                        : (careTeamMember.staff_department || 'N/A')
                      }
                    </td>
                    {!patientId && (
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {careTeamMember.patient_first_name} {careTeamMember.patient_last_name}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {careTeamMember.assigned_at ? new Date(careTeamMember.assigned_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        careTeamMember.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {careTeamMember.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      <button
                        onClick={() => handleRemoveMember(careTeamMember.care_team_id || careTeamMember.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove from care team"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {patientId ? 'No care team members assigned to this patient yet' : 'No care team members assigned yet'}
            </p>
            {!isAddingMember && (
              <button
                onClick={() => setIsAddingMember(true)}
                className="mt-2 inline-flex items-center text-blue-600 text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add first team member
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CareTeam;
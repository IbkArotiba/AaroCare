import React, { useState, useEffect } from 'react';
import { PlusCircle, Clock, AlertTriangle, Tag, User, Search, Filter, RefreshCw, Trash2 } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';

const PatientNotes = ({ patientId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  
  const [newNote, setNewNote] = useState({
    content: '',
    patient_id: patientId || '',
    note_type: 'general',
    priority: 'normal',
    title: '',
  });

  // Note types and priorities for filtering
  const noteTypes = [
    { value: 'general', label: 'General' },
    { value: 'medical', label: 'Medical' },
    { value: 'administrative', label: 'Administrative' },
    { value: 'dietary', label: 'Dietary' },
    { value: 'therapy', label: 'Therapy' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];
  
  // Delete note functionality
  const deleteNote = async (noteId, patientId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this note?')) {
        return;
      }
      
      await apiClient.delete(`/api/notes/patients/${patientId}/notes/${noteId}`);
      toast.success('Note deleted successfully');
      fetchNotes(); // Refresh notes list
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  // Fetch notes for this patient
  const fetchNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch notes based on whether we have a patientId or not
        if (patientId) {
          console.log("Fetching notes for patient:", patientId);
          const response = await apiClient.get(`/api/patients/${patientId}/notes`);
          console.log("Patient notes data:", response.data);
          setNotes(response.data);
        } else {
          console.log("Fetching all notes");
          const response = await apiClient.get(`/api/notes`);
          console.log("All notes data:", response.data);
          setNotes(response.data);
        }

        // Always fetch users and patients for the form
        const [usersResponse] = await Promise.all([
            apiClient.get(`/api/users`),
        ]);
        
        console.log("Users data:", usersResponse.data);
        
        setUsers(usersResponse.data);
      
      
      
      } catch (error) {
        console.error('Error fetching patient notes:', error);
        setError('Failed to load patient notes. Please make sure you are logged in.');
        setNotes([]); // Set empty array on error
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

  // Add a new note
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newNote.content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }
    if (!newNote.title.trim()) {
      toast.error('Note title cannot be empty');
      return;
    }
    if (!newNote.patient_id) {
      toast.error('Please select a patient');
      return;
    }

    try {
      console.log('Submitting note:', newNote);
      const response = await apiClient.post(`/api/notes/patients/${newNote.patient_id}/notes`, newNote);
      console.log('Note added response:', response);
      fetchNotes();
      toast.success('Note added successfully');
      setNewNote({ 
        content: '', 
        note_type: 'general', 
        priority: 'normal', 
        title: '', 
        patient_id: patientId || '' 
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error(`Failed to add note: ${error.response?.data?.message || error.message}`);
    }
  };

  // Filter notes based on search and filters
  const filteredNotes = notes.filter(note => {
    const matchesSearch = ((note.title || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
                         ((note.content || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || note.note_type === filterType;
    const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
    return matchesSearch && matchesType && matchesPriority;
});

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Load data on component mount
  useEffect(() => {
      // Initial load
      fetchNotes();
      fetchPatients();
      
      // Update new note form if patientId changes
      setNewNote(prev => ({
        ...prev,
        patient_id: patientId || ''
      }));
    }, [patientId]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Medical Notes</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchNotes()}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Refresh notes"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Note</span>
              </button>
            )}
        </div>
      </div>
      
        {/* Search and filter */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full border rounded-md p-2 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-10 w-full border rounded-md p-2 text-sm"
          >
            <option value="all">All Note Types</option>
            {noteTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <AlertTriangle className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="pl-10 w-full border rounded-md p-2 text-sm"
          >
            <option value="all">All Priorities</option>
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>{priority.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
    
      {/* Show error if any */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="text-red-700">{error}</div>
        </div>
      )}
    
      
 
      {/* Add note form */}
      {showForm && (
        <div className="p-4 border-b bg-gray-50">
          <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient
            </label>
            <select
              value={newNote.patient_id}
              onChange={(e) => setNewNote({...newNote, patient_id: e.target.value})}
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
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newNote.title}
                onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Enter note title..."
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Content
              </label>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                rows="4"
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Enter note content..."
                required
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Type
                </label>
                <select
                  value={newNote.note_type}
                  onChange={(e) => setNewNote({...newNote, note_type: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  {noteTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newNote.priority}
                  onChange={(e) => setNewNote({...newNote, priority: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-300 bg-white text-gray-700 py-1 px-4 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-4 rounded-md text-sm"
              >
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes list */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading notes...</p>
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className="space-y-4">
            {filteredNotes.map((note) => {
          const priority = priorities.find(p => p.value === note.priority) || 
          priorities.find(p => p.value === note.priority?.toLowerCase()) || 
          priorities[1]; // Default to normal
          const noteType = noteTypes.find(t => t.value === note.note_type) || noteTypes[0]; // Default to general
              
              return (
                <div key={note.id} className="bg-white rounded-lg shadow overflow-hidden mb-4 border border-gray-100">
                  <div className="p-4 border-b flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{note.title}</h3>
                      
                      {!patientId && (
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">Patient: </span>
                          {`${note.patient_first_name || note.first_name || 'N/A'} ${note.patient_last_name || note.last_name || 'N/A'} `}
                          <span className="text-gray-400">
                            ({note.patient_medical_record_number || note.medical_record_number || 'N/A'})
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium capitalize">
                          {noteType.label} Note
                        </span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white bg-opacity-50">
                        {priority.label} Priority
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => deleteNote(note.id, note.patient_id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  
                  <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      <span>
                        {note.staff_first_name || note.first_name || note.author_first_name || 'N/A'} {note.staff_last_name || note.last_name || note.author_last_name || 'N/A'}
                        <span className="text-gray-400">
                          {" "}({note.staff_role || note.role || note.author_role || 'N/A'})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            {searchTerm || filterType !== 'all' || filterPriority !== 'all' ? (
              <p className="text-gray-500">No notes match your search criteria</p>
            ) : (
              <>
                <p className="text-gray-500">No notes have been added for this patient</p>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-2 inline-flex items-center text-blue-600 text-sm"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add first note
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientNotes;
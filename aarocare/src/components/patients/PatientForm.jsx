import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/services/apiClient';

function PatientForm({ onSubmit }) {
    const [formData, setFormData] = useState({
        medical_record_number: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        admission_date: new Date().toISOString().split('T')[0],
        status: 'active',
        room_number: '',
        bed_number: '',
        primary_diagnosis: '',
        allergies: '',
        medications: ''
    });
    
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when field is edited
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validate = () => {
        const newErrors = {};
        
        if (!formData.medical_record_number.trim()) newErrors.medical_record_number = 'Medical Record Number is required';
        if (!formData.first_name.trim()) newErrors.first_name = 'First Name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last Name is required';
        if (!formData.date_of_birth.trim()) newErrors.date_of_birth = 'Date of Birth is required';
        if (!formData.gender.trim()) newErrors.gender = 'Gender is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.emergency_contact_name.trim()) newErrors.emergency_contact_name = 'Emergency Contact Name is required';
        if (!formData.emergency_contact_phone.trim()) newErrors.emergency_contact_phone = 'Emergency Contact Phone is required';
        if (!formData.emergency_contact_relationship.trim()) newErrors.emergency_contact_relationship = 'Emergency Contact Relationship is required';
        if (!formData.admission_date.trim()) newErrors.admission_date = 'Admission Date is required';
        if (!formData.room_number.trim()) newErrors.room_number = 'Room Number is required';
        if (!formData.bed_number.trim()) newErrors.bed_number = 'Bed Number is required';
        if (!formData.primary_diagnosis.trim()) newErrors.primary_diagnosis = 'Primary Diagnosis is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (validate()) {
            setIsSubmitting(true);
            
            try {
                // Submit to your API endpoint
                const response = await apiClient.post('/api/patients', {
                    medical_record_number: formData.medical_record_number,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    date_of_birth: formData.date_of_birth,
                    gender: formData.gender,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    emergency_contact_name: formData.emergency_contact_name,
                    emergency_contact_phone: formData.emergency_contact_phone,
                    emergency_contact_relationship: formData.emergency_contact_relationship,
                    admission_date: formData.admission_date,
                    room_number: formData.room_number,
                    bed_number: formData.bed_number,
                    primary_diagnosis: formData.primary_diagnosis,
                    allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
                    medications: formData.medications ? formData.medications.split(',').map(m => m.trim()) : []
                });

                // Call parent's onSubmit if provided
                if (onSubmit) {
                    onSubmit(response.data.patient);
                }

                // Reset form after successful submission
                setFormData({
                    medical_record_number: '',
                    first_name: '',
                    last_name: '',
                    date_of_birth: '',
                    gender: '',
                    email: '',
                    phone: '',
                    address: '',
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                    emergency_contact_relationship: '',
                    admission_date: new Date().toISOString().split('T')[0],
                    status: 'active',
                    room_number: '',
                    bed_number: '',
                    primary_diagnosis: '',
                    allergies: '',
                    medications: ''
                });

                alert('Patient created successfully!');
            } catch (error) {
                console.error('Error creating patient:', error);
                alert('Error creating patient. Please try again.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="patient-form-container p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
            
            <h3 className="text-xl font-semibold mb-6 text-gray-800">Create New Patient</h3>
            
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Medical Record Number */}
                <div>
                    <label htmlFor="medical_record_number" className="block text-sm font-medium mb-2 text-gray-700">
                        Medical Record Number *
                    </label>
                    <input 
                        type="text" 
                        id="medical_record_number" 
                        name="medical_record_number" 
                        value={formData.medical_record_number}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-md ${errors.medical_record_number ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Enter medical record number"
                    />
                    {errors.medical_record_number && <p className="text-red-500 text-sm mt-1">{errors.medical_record_number}</p>}
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="first_name" className="block text-sm font-medium mb-2 text-gray-700">
                            First Name *
                        </label>
                        <input 
                            type="text" 
                            id="first_name" 
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-md ${errors.first_name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="Enter first name"
                        />
                        {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
                    </div>

                    <div>
                        <label htmlFor="last_name" className="block text-sm font-medium mb-2 text-gray-700">
                            Last Name *
                        </label>
                        <input 
                            type="text" 
                            id="last_name" 
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-md ${errors.last_name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="Enter last name"
                        />
                        {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
                    </div>
                </div>

                {/* Date of Birth and Gender */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium mb-2 text-gray-700">
                            Date of Birth *
                        </label>
                        <input 
                            type="date"
                            id="date_of_birth" 
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-md ${errors.date_of_birth ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                        {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth}</p>}
                    </div>

                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium mb-2 text-gray-700">
                            Gender *
                        </label>
                        <select 
                            id="gender" 
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-md ${errors.gender ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                    </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700">
                            Email *
                        </label>
                        <input 
                            type="email"
                            id="email" 
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="Enter email address"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-2 text-gray-700">
                            Phone *
                        </label>
                        <input
                            type="tel"
                            id="phone" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="Enter phone number"
                        />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>
                </div>

                {/* Address */}
                <div>
                    <label htmlFor="address" className="block text-sm font-medium mb-2 text-gray-700">
                        Address *
                    </label>
                    <textarea
                        id="address" 
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows="2"
                        className={`w-full p-3 border rounded-md ${errors.address ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Enter full address"
                    />
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                {/* Emergency Contact */}
                <div className="border-t pt-4">
                    <h4 className="text-lg font-medium mb-3 text-gray-800">Emergency Contact</h4>
                    
                    <div>
                        <label htmlFor="emergency_contact_name" className="block text-sm font-medium mb-2 text-gray-700">
                            Emergency Contact Name *
                        </label>
                        <input 
                            type="text"
                            id="emergency_contact_name" 
                            name="emergency_contact_name"
                            value={formData.emergency_contact_name}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-md ${errors.emergency_contact_name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="Enter emergency contact name"
                        />
                        {errors.emergency_contact_name && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_name}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label htmlFor="emergency_contact_phone" className="block text-sm font-medium mb-2 text-gray-700">
                                Emergency Contact Phone *
                            </label>
                            <input
                                type="tel" 
                                id="emergency_contact_phone" 
                                name="emergency_contact_phone"
                                value={formData.emergency_contact_phone}
                                onChange={handleChange}
                                className={`w-full p-3 border rounded-md ${errors.emergency_contact_phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="Enter emergency contact phone"
                            />
                            {errors.emergency_contact_phone && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_phone}</p>}
                        </div>

                        <div>
                            <label htmlFor="emergency_contact_relationship" className="block text-sm font-medium mb-2 text-gray-700">
                                Relationship *
                            </label>
                            <input 
                                type="text" 
                                id="emergency_contact_relationship" 
                                name="emergency_contact_relationship"
                                value={formData.emergency_contact_relationship}
                                onChange={handleChange}
                                className={`w-full p-3 border rounded-md ${errors.emergency_contact_relationship ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="e.g., Spouse, Parent, Sibling"
                            />
                            {errors.emergency_contact_relationship && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_relationship}</p>}
                        </div>
                    </div>
                </div>

                {/* Medical Information */}
                <div className="border-t pt-4">
                    <h4 className="text-lg font-medium mb-3 text-gray-800">Medical Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="admission_date" className="block text-sm font-medium mb-2 text-gray-700">
                                Admission Date *
                            </label>
                            <input
                                type="date" 
                                id="admission_date" 
                                name="admission_date"
                                value={formData.admission_date}
                                onChange={handleChange}
                                className={`w-full p-3 border rounded-md ${errors.admission_date ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            />
                            {errors.admission_date && <p className="text-red-500 text-sm mt-1">{errors.admission_date}</p>}
                        </div>

                        <div>
                            <label htmlFor="room_number" className="block text-sm font-medium mb-2 text-gray-700">
                                Room Number *
                            </label>
                            <input 
                                type="text"
                                id="room_number" 
                                name="room_number"
                                value={formData.room_number}
                                onChange={handleChange}
                                className={`w-full p-3 border rounded-md ${errors.room_number ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="e.g., 101A"
                            />
                            {errors.room_number && <p className="text-red-500 text-sm mt-1">{errors.room_number}</p>}
                        </div>

                        <div>
                            <label htmlFor="bed_number" className="block text-sm font-medium mb-2 text-gray-700">
                                Bed Number *
                            </label>
                            <input 
                                type="text"
                                id="bed_number" 
                                name="bed_number"
                                value={formData.bed_number}
                                onChange={handleChange}
                                className={`w-full p-3 border rounded-md ${errors.bed_number ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="e.g., B1"
                            />
                            {errors.bed_number && <p className="text-red-500 text-sm mt-1">{errors.bed_number}</p>}
                        </div>
                    </div>

                    <div className="mt-4">
                        <label htmlFor="primary_diagnosis" className="block text-sm font-medium mb-2 text-gray-700">
                            Primary Diagnosis *
                        </label>
                        <textarea 
                            id="primary_diagnosis" 
                            name="primary_diagnosis"
                            value={formData.primary_diagnosis}
                            onChange={handleChange}
                            rows="3"
                            className={`w-full p-3 border rounded-md ${errors.primary_diagnosis ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="Enter primary diagnosis"
                        />
                        {errors.primary_diagnosis && <p className="text-red-500 text-sm mt-1">{errors.primary_diagnosis}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label htmlFor="allergies" className="block text-sm font-medium mb-2 text-gray-700">
                                Allergies
                            </label>
                            <textarea 
                                id="allergies" 
                                name="allergies"
                                value={formData.allergies}
                                onChange={handleChange}
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter allergies (comma-separated)"
                            />
                            <p className="text-xs text-gray-500 mt-1">Separate multiple allergies with commas</p>
                        </div>

                        <div>
                            <label htmlFor="medications" className="block text-sm font-medium mb-2 text-gray-700">
                                Current Medications
                            </label>
                            <textarea 
                                id="medications" 
                                name="medications"
                                value={formData.medications}
                                onChange={handleChange}
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter current medications (comma-separated)"
                            />
                            <p className="text-xs text-gray-500 mt-1">Separate multiple medications with commas</p>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating Patient...
                            </span>
                        ) : (
                            'Create Patient'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PatientForm;
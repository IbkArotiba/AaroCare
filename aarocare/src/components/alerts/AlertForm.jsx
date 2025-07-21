import React from 'react';
import { useState } from 'react';

function AlertForm({ onSubmit }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: '',
        department: ''
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
        
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        if (!formData.department) newErrors.department = 'Department is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (validate()) {
            setIsSubmitting(true);
            
            // Create the alert object with required format
            const newAlert = {
                id: Date.now(), // Temporary ID, backend will likely replace this
                priority: formData.priority,
                message: `${formData.title}: ${formData.description}`,
                timestamp: new Date().toLocaleTimeString(),
                department: formData.department,
                read: false
            };
            
            // Call the parent's onSubmit function with the new alert
            onSubmit(newAlert);
            
            // Reset form after submission
            setFormData({
                title: '',
                description: '',
                priority: '',
                department: ''
            });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="alert-form-container p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-medium mb-4">Create New Alert</h3>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="title" className="block text-sm font-medium mb-1">Title:</label>
                    <input 
                        type="text" 
                        id="title" 
                        name="title" 
                        value={formData.title}
                        onChange={handleChange}
                        className={`w-full p-2 border rounded ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>
                
                <div className="mb-3">
                    <label htmlFor="description" className="block text-sm font-medium mb-1">Description:</label>
                    <textarea 
                        id="description" 
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className={`w-full p-2 border rounded ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                        rows="3"
                    ></textarea>
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>
                
                <div className="mb-3">
                    <label htmlFor="priority" className="block text-sm font-medium mb-1">Priority Level:</label>
                    <select 
                        id="priority" 
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className={`w-full p-2 border rounded ${errors.priority ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        <option value="">Select Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                    {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority}</p>}
                </div>
                
                <div className="mb-4">
                    <label htmlFor="department" className="block text-sm font-medium mb-1">Department:</label>
                    <select 
                        id="department" 
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className={`w-full p-2 border rounded ${errors.department ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        <option value="">Select Department</option>
                        <option value="general">General</option>
                        <option value="emergency">Emergency</option>
                        <option value="icu">ICU</option>
                        <option value="surgery">Surgery</option>
                        <option value="pediatrics">Pediatrics</option>
                        <option value="lab">Lab</option>
                        <option value="pharmacy">Pharmacy</option>
                    </select>
                    {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                </div>
                
                <button 
                    type="submit" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Sending...' : 'Send Alert'}
                </button>
            </form>
        </div>
    );
}

export default AlertForm;

const db = require('../config/database');
const validateCreatePatient = async (req, res, next) => {
    const { first_name, last_name, medical_record_number, date_of_birth, gender, email, phone, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship } = req.body;
    if (!first_name || !last_name || !medical_record_number || !date_of_birth || !gender || !email || !phone || !address || !emergency_contact_name || !emergency_contact_phone || !emergency_contact_relationship) {
        return res.status(400).json({message: 'All fields are required'});
    }
    next();
};
const validateMedicalRecordNumber =  async(req, res, next) => {
    try{
    const { medical_record_number } = req.body;
    const patients = await db.query(
        `SELECT * FROM patients WHERE medical_record_number = $1`,
        [medical_record_number]
    );
    if (patients.rows.length > 0) {
        return res.status(400).json({message: 'Medical record number is taken'});
    }
    next();
    }catch(error){
        console.error('Error validating medical record number:', error);
        return res.status(500).json({message: 'Failed to validate medical record number'});
    }
};

const validateDateOfBirth = (req, res, next) => {
    const { date_of_birth } = req.body;
    const dateOfBirth = new Date(date_of_birth);
    if (dateOfBirth > new Date()) {
        return res.status(400).json({message: 'Date of birth cannot be in the future'});
    }
    next();
};

const validatePhoneNumber = (req, res, next) => {
    const { phone } = req.body;
    const phoneRegex = /^\d{10}$/;

    if (!phoneRegex.test(phone)) {
        return res.status(400).json({message: 'Phone number must be 10 digits'});
    }
    next();
};

const validateEmail = (req, res, next) => {
    const { email } = req.body;
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    
    if (!emailRegex.test(email)) {
        return res.status(400).json({message: 'Email is invalid'});
    }
    next();
};


const validateNoteContent = (req, res, next) => {
    const { content } = req.body;
    if (!content || content.length < 10) {
        return res.status(400).json({message: 'Note is required'});
    }
    next();
};

const validateTreatmentPlan = (req, res, next) => {
    const { diagnosis } = req.body;
    if (!diagnosis || diagnosis.length < 10) {
        return res.status(400).json({message: 'Diagnosis is required'});
    }
    next();
};
    
module.exports = {
    validateCreatePatient,
    validateMedicalRecordNumber,
    validateDateOfBirth,
    validatePhoneNumber,
    validateEmail,
    validateNoteContent,
    validateTreatmentPlan
};
    
<div align="center">
  <img src="./aarocare/src/components/auth/Logo.jpeg" alt="AaroCare Logo" width="200"/>
</div>

# Aarọ Care

A healthcare management application for streamlined patient care and team coordination.

Link to the live demo: https://aarocare.netlify.app 
**Demo Access**:

A demo account is available for testing. Please contact the project team for credentials.



## 🎬 Demo
![AaroCare Demo](./demos/ezgif.com-crop.gif)

## 📖 Table of Contents
- [✨ Features](#features)
- [🎬 Demo](#demo)
- [🏗️ Architecture](#architecture)
- [🚀 Quick Start](#quick-start)
- [📱 Screenshots](#screenshots)
- [🛠️ Tech Stack](#tech-stack)
- [📊 Database Schema](#database-schema)
- [🤝 Contributing](#contributing)
- [📄 License](#license)
- [👨‍💻 Author](#author)

## ✨ Features

### 🏥 Core Healthcare Management
- **Patient Registration & Profiles** - Complete patient demographic management
- **Electronic Health Records** - Digital medical records with history tracking
- **Vital Signs Monitoring** - Real-time patient vital signs tracking
- **Treatment Plans** - Comprehensive care planning and tracking

### 👥 Staff & Team Management
- **Care Team Assignment** - Multi-disciplinary team coordination
- **Role-Based Access Control** - Secure access based on staff roles
- **Real-time Collaboration** - Live updates and notifications

### 📊 Advanced Features
- **Real-time Dashboard** - Live patient statistics and alerts
- **Notes & Documentation** - Searchable medical notes system
- **WebSocket Integration** - Real-time updates across the platform
- **Mobile Responsive** - Works seamlessly on all devices

## 🏗️ Architecture

### Frontend
- **React** - Modern web framework
- **Vite** - Fast development environment
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Socket.IO** - Real-time communication

### Backend
- **Node.js** - Server-side runtime
- **Express** - Web framework
- **AWS Cognito** - Authentication
- **Supabase** - Database and authentication
- **PostgreSQL** - Relational Database
- **Socket.IO** - Real-time communication

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │────│   Node.js API   │────│   Supabase DB   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Authentication│    │ • Patients      │
│ • Patient Mgmt  │    │ • CRUD APIs     │    │ • Staff         │
│ • Vitals        │    │ • WebSocket     │    │ • Medical Data  │
│ • Notes         │    │ • Middleware    │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                       │                       │
└───────────────────────┼───────────────────────┘
│
┌─────────────────┐
│   AWS Cognito   │
│  Authentication │
└─────────────────┘

## 🚀 Quick Start

### Prerequisites

- Node.js
- npm or yarn



### Environment Variables

The application requires several environment variables to be set up. Create a `.env` file in both the root directory and the `backend` directory with the following variables (replace with your actual values):

```
# Frontend (.env in root or aarocare directory)
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_DOMAIN=your-cognito-domain
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Aarọ Care
VITE_SOCKET_URL=http://localhost:3001
VITE_DEBUG=false

# Backend (.env in backend directory)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-key
```

### Installation

```bash
# Install frontend dependencies
cd aarocare
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Running the Application

```bash
# Start backend
cd backend
npm start

# Start frontend
cd ../aarocare
npm run dev
```

## Security Note

This repository does not contain any sensitive information. All API keys, database credentials, and other secrets should be provided via environment variables and are not committed to version control.


## 📊 Database Schema

The database schema is as follows:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with MedSync roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('doctor', 'nurse', 'admin')) NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- Patients table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    medical_record_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    admission_date TIMESTAMP,
    discharge_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'transferred')),
    room_number VARCHAR(20),
    bed_number VARCHAR(20),
    primary_diagnosis TEXT,
    allergies JSONB DEFAULT '[]',
    medications JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- Care teams (many-to-many: users assigned to patients)
CREATE TABLE care_teams (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_in_care VARCHAR(50) NOT NULL, -- 'primary_doctor', 'consulting_doctor', 'primary_nurse', etc.
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(patient_id, user_id, role_in_care)
);
```

```sql
-- Patient notes (collaborative editing)
CREATE TABLE patient_notes (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id),
    title VARCHAR(200),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN ('general', 'diagnosis', 'treatment', 'nursing', 'discharge')),
    is_private BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    version INTEGER DEFAULT 1,
    is_locked BOOLEAN DEFAULT false,
    locked_by INTEGER REFERENCES users(id),
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- Vital signs (nurse updates)
CREATE TABLE vital_signs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    recorded_by INTEGER REFERENCES users(id),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL(5,2),
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,
    pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- Treatment plans (doctor creates/updates)
CREATE TABLE treatment_plans (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id),
    diagnosis TEXT NOT NULL,
    treatment_goals TEXT,
    medications JSONB DEFAULT '[]',
    procedures JSONB DEFAULT '[]',
    dietary_restrictions TEXT,
    activity_level VARCHAR(100),
    follow_up_instructions TEXT,
    estimated_discharge_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'modified', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- Audit logs (HIPAA compliance)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    patient_id INTEGER REFERENCES patients(id),
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
    entity_type VARCHAR(50) NOT NULL, -- 'patient', 'note', 'vitals', 'treatment_plan'
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- Sessions for user management
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- Indexes for performance
CREATE INDEX idx_patients_mrn ON patients(medical_record_number);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_care_teams_patient ON care_teams(patient_id);
CREATE INDEX idx_care_teams_user ON care_teams(user_id);
CREATE INDEX idx_notes_patient ON patient_notes(patient_id);
CREATE INDEX idx_notes_author ON patient_notes(author_id);
CREATE INDEX idx_notes_type ON patient_notes(note_type);
CREATE INDEX idx_vitals_patient ON vital_signs(patient_id);
CREATE INDEX idx_vitals_recorded_at ON vital_signs(recorded_at);
CREATE INDEX idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
```

```sql
-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## 🔧 API Documentation

### Authentication Endpoints
```
POST /api/auth/login     - User login
POST /api/auth/logout    - User logout  
POST /api/auth/refresh   - Refresh token
```

### Patient Management
```
GET    /api/patients           - Get all patients
GET    /api/patients/:id       - Get patient by ID
POST   /api/patients           - Create new patient
PUT    /api/patients/:id       - Update patient
DELETE /api/patients/:id       - Delete patient
```

### Vitals Management
```
GET    /api/vitals/:patientId  - Get patient vitals
POST   /api/vitals             - Record new vitals
PUT    /api/vitals/:id         - Update vitals
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="Patient"
```

## 🚀 Deployment

Using Netlify (Frontend)
Using Render (Backend)


## 👨‍💻 Author
Ibukunoluwa  Arotiba

GitHub: <https://github.com/IbkArotiba>
LinkedIn: <http://linkedin.com/in/ibukunoluwa-a-62ab3b237>
Email: ibukunarotiba19@gmail.com
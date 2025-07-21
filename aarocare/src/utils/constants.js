export const USER_ROLES = {
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    ADMIN: 'admin',
  };
  
  export const PATIENT_STATUS = {
    ACTIVE: 'active',
    DISCHARGED: 'discharged',
    TRANSFERRED: 'transferred',
  };
  
  export const NOTE_TYPES = {
    GENERAL: 'general',
    DIAGNOSIS: 'diagnosis',
    TREATMENT: 'treatment',
    NURSING: 'nursing',
    DISCHARGE: 'discharge',
  };
  
  export const PRIORITY_LEVELS = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
  };
  
  export const API_ENDPOINTS = {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh',
      PROFILE: '/auth/profile',
      ME: '/auth/me',
    },
    PATIENTS: {
      LIST: '/patients',
      DETAIL: (id) => `/patients/${id}`,
      CREATE: '/patients',
      UPDATE: (id) => `/patients/${id}`,
      DISCHARGE: (id) => `/patients/${id}/discharge`,
    },
    VITALS: {
      LIST: (patientId) => `/patients/${patientId}/vitals`,
      CREATE: (patientId) => `/patients/${patientId}/vitals`,
      HISTORY: (patientId) => `/patients/${patientId}/vitals/history`,
    },
    NOTES: {
      LIST: (patientId) => `/patients/${patientId}/notes`,
      CREATE: (patientId) => `/patients/${patientId}/notes`,
      UPDATE: (patientId, noteId) => `/patients/${patientId}/notes/${noteId}`,
      DELETE: (patientId, noteId) => `/patients/${patientId}/notes/${noteId}`,
    },
    CARE_TEAM: {
      LIST: (patientId) => `/patients/${patientId}/care-team`,
      ASSIGN: (patientId) => `/patients/${patientId}/care-team`,
      UPDATE: (patientId, memberId) => `/patients/${patientId}/care-team/${memberId}`,
      REMOVE: (patientId, memberId) => `/patients/${patientId}/care-team/${memberId}`,
    },
  };
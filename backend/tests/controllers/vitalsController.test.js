const request = require('supertest');
const app = require('../../app');
const db = require('../../config/database');
const jwt = require('jsonwebtoken');

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation(() => ({ 
    id: 'test-user-id',
    role: 'doctor' 
  }))
}));

// Mock the database
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  end: jest.fn().mockResolvedValue(null)
}));

describe('Vitals Controller Tests', () => {
  let mockToken;
  
  beforeEach(() => {
    // Mock JWT token for authentication
    mockToken = 'Bearer mock-jwt-token';
    jest.clearAllMocks();
    db.query = jest.fn().mockResolvedValue({ rows: [] });
  });

  afterAll(async () => {
    // Clean up database connections
    if (db.end) await db.end();
  });

  describe('GET /api/vitals/patients/:id/vitals', () => {
    it('should return patient vitals', async () => {
      // Set up mock data for this specific test
      const mockVitals = {
        rows: [
          {
            id: 1,
            patient_id: 1,
            recorded_at: '2023-06-15T10:30:00Z',
            recorded_by: 'test-user-id',
            respiratory_rate: 16,
            blood_pressure_systolic: 120,
            blood_pressure_diastolic: 80,
            heart_rate: 72,
            temperature: 98.6,
            oxygen_saturation: 98,
            pain_level: 0,
            name: 'John Doe',
            medical_record_number: 'MRN001'
          }
        ]
      };
      
      // Mock the database response for this test
      db.query.mockImplementation((query) => {
        if (query.includes('FROM vital_signs')) {
          return mockVitals;
        }
        // Default mock for audit logs
        return { rows: [] };
      });
      
      const response = await request(app)
        .get('/api/vitals/patients/1/vitals')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toEqual([
        {
          id: 1,
          patient_id: 1,
          recorded_at: '2023-06-15T10:30:00Z',
          recorded_by: 'test-user-id',
          respiratory_rate: 16,
          blood_pressure_systolic: 120,
          blood_pressure_diastolic: 80,
          heart_rate: 72,
          temperature: 98.6,
          oxygen_saturation: 98,
          pain_level: 0,
          name: 'John Doe',
          medical_record_number: 'MRN001'
        }
      ]);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM vital_signs'),
        expect.any(Array)
      );
      // Second call for audit logging
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should filter vitals by date', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const testDate = '2023-06-15';
      await request(app)
        .get(`/api/vitals/patients/1/vitals?date=${testDate}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE vital_signs.patient_id = $1 AND DATE(vital_signs.recorded_at) = $2'),
        expect.arrayContaining(['1', testDate, 0])
      );
    });

    it('should handle pagination', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/vitals/patients/1/vitals?page=2')
        .set('Authorization', mockToken)
        .expect(200);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([40]) // page 2 * 20 = offset 40
      );
    });

    it('should return 500 when database query fails', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/vitals/patients/1/vitals')
        .set('Authorization', mockToken)
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch patients vital signs');
    });
  });

  describe('POST /api/vitals/patients/:id/vitals', () => {
    it('should record new vitals successfully', async () => {
      const vitalsData = {
        respiratory_rate: 16,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        heart_rate: 72,
        temperature: 98.6,
        oxygen_saturation: 98,
        pain_level: 0,
        height: 180,
        weight: 75,
        notes: 'Patient appears healthy'
      };

      const mockCreatedVitals = {
        rows: [{
          id: 1,
          patient_id: 1,
          recorded_at: '2023-06-15T10:30:00Z',
          recorded_by: 'test-user-id',
          ...vitalsData
        }]
      };

      db.query.mockResolvedValueOnce(mockCreatedVitals); // First call to insert vitals
      db.query.mockResolvedValueOnce({ rows: [] }); // Second call for audit logging

      const response = await request(app)
        .post('/api/vitals/patients/1/vitals')
        .set('Authorization', mockToken)
        .send(vitalsData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Vitals recorded successfully');
      expect(response.body).toHaveProperty('vital_signs');
      expect(response.body.vital_signs).toEqual(mockCreatedVitals.rows[0]);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vital_signs'),
        expect.any(Array)
      );
      
      // Check for audit log
      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO audit_logs/),
        expect.any(Array)
      );
    });

    it('should return 500 when vital recording fails', async () => {
      const vitalsData = {
        respiratory_rate: 16,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80
      };

      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/vitals/patients/1/vitals')
        .set('Authorization', mockToken)
        .send(vitalsData)
        .expect(500);

      expect(response.body.message).toBe('Failed to record vital signs');
    });

    it('should allow incomplete vital records', async () => {
      // Only providing partial vitals data
      const partialVitalsData = {
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
      };

      const mockCreatedVitals = {
        rows: [{
          id: 1,
          patient_id: 1,
          recorded_at: '2023-06-15T10:30:00Z',
          recorded_by: 'test-user-id',
          ...partialVitalsData,
          respiratory_rate: null,
          heart_rate: null,
          temperature: null,
          oxygen_saturation: null,
          pain_level: null
        }]
      };

      db.query.mockResolvedValueOnce(mockCreatedVitals);
      db.query.mockResolvedValueOnce({ rows: [] }); // Audit logging

      await request(app)
        .post('/api/vitals/patients/1/vitals')
        .set('Authorization', mockToken)
        .send(partialVitalsData)
        .expect(201);
    });
  });

  describe('GET /api/vitals/patients/:id/vitals/history', () => {
    it('should return vitals history with trend analysis', async () => {
      // Mock the last two readings
      const mockLatestVital = {
        rows: [{
          id: 2,
          patient_id: 1,
          recorded_at: '2023-06-15T10:30:00Z',
          respiratory_rate: 16,
          blood_pressure_systolic: 120,
          blood_pressure_diastolic: 80,
          heart_rate: 72,
          temperature: 98.6,
          oxygen_saturation: 98,
          pain_level: 0,
          height: 180,
          weight: 75
        }]
      };

      const mockPreviousVital = {
        rows: [{
          id: 1,
          patient_id: 1,
          recorded_at: '2023-06-14T10:30:00Z',
          respiratory_rate: 18,
          blood_pressure_systolic: 125,
          blood_pressure_diastolic: 85,
          heart_rate: 75,
          temperature: 98.4,
          oxygen_saturation: 97,
          pain_level: 1,
          height: 180,
          weight: 76
        }]
      };

      const mockAverages = {
        rows: [{
          avg_respiratory_rate: '17.0',
          avg_bp_systolic: '122.5',
          avg_bp_diastolic: '82.5',
          avg_heart_rate: '73.5',
          avg_temperature: '98.5',
          avg_oxygen_saturation: '97.5',
          avg_pain_level: '0.5',
          avg_weight: '75.5'
        }]
      };

      // Setup mock responses in sequence
      db.query
        .mockResolvedValueOnce(mockLatestVital)
        .mockResolvedValueOnce(mockPreviousVital)
        .mockResolvedValueOnce(mockAverages);

      const response = await request(app)
        .get('/api/vitals/patients/1/vitals/history')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('trend_analysis');
      expect(response.body).toHaveProperty('timestamps');
      
      expect(response.body.trend_analysis).toHaveProperty('respiratory_rate');
      expect(response.body.trend_analysis).toHaveProperty('blood_pressure');
      expect(response.body.trend_analysis).toHaveProperty('heart_rate');
      expect(response.body.trend_analysis).toHaveProperty('temperature');
      expect(response.body.trend_analysis).toHaveProperty('oxygen_saturation');
      expect(response.body.trend_analysis).toHaveProperty('pain_level');
      expect(response.body.trend_analysis).toHaveProperty('weight');
      expect(response.body.trend_analysis).toHaveProperty('height');
      
      expect(response.body.timestamps).toHaveProperty('latest_reading');
      expect(response.body.timestamps).toHaveProperty('previous_reading');

      // Verify calculations
      expect(response.body.trend_analysis.respiratory_rate.current).toBe(16);
      expect(response.body.trend_analysis.respiratory_rate.previous).toBe(18);
      expect(response.body.trend_analysis.respiratory_rate.change).toBeDefined();
      expect(response.body.trend_analysis.respiratory_rate.avg_7_days).toBe("17.0");
    });

    it('should handle case with no previous vital signs', async () => {
      // Mock only having one reading
      const mockLatestVital = {
        rows: [{
          id: 1,
          patient_id: 1,
          recorded_at: '2023-06-15T10:30:00Z',
          respiratory_rate: 16,
          blood_pressure_systolic: 120,
          blood_pressure_diastolic: 80,
          heart_rate: 72,
          temperature: 98.6,
          oxygen_saturation: 98,
          pain_level: 0,
          height: 180,
          weight: 75
        }]
      };

      const mockPreviousVital = { rows: [] }; // No previous vitals
      const mockAverages = {
        rows: [{
          avg_respiratory_rate: '16.0',
          avg_bp_systolic: '120.0',
          avg_bp_diastolic: '80.0',
          avg_heart_rate: '72.0',
          avg_temperature: '98.6',
          avg_oxygen_saturation: '98.0',
          avg_pain_level: '0.0',
          avg_weight: '75.0'
        }]
      };

      db.query
        .mockResolvedValueOnce(mockLatestVital)
        .mockResolvedValueOnce(mockPreviousVital)
        .mockResolvedValueOnce(mockAverages);

      const response = await request(app)
        .get('/api/vitals/patients/1/vitals/history')
        .set('Authorization', mockToken)
        .expect(200);

      // Should still have trend analysis but with null previous values
      expect(response.body).toHaveProperty('trend_analysis');
      expect(response.body.trend_analysis.respiratory_rate.previous).toBeNull();
      expect(response.body.trend_analysis.respiratory_rate.change).toBe('N/A');
    });

    it('should return 404 when no vital signs exist', async () => {
      // No vitals found at all
      db.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/vitals/patients/1/vitals/history')
        .set('Authorization', mockToken)
        .expect(404);
    });

    it('should return 500 when fetching vitals history fails', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/vitals/patients/1/vitals/history')
        .set('Authorization', mockToken)
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch vital signs history');
    });
  });

  describe('calculatePercentChange helper function', () => {
    it('should calculate percent change correctly', async () => {
      // Import the standalone calculatePercentChange function
      const { calculatePercentChange } = require('../../controllers/vitalsController');
      
      // Test the actual exported function
      expect(calculatePercentChange(110, 100)).toBe('+10.00%');
      expect(calculatePercentChange(90, 100)).toBe('-10.00%');
      expect(calculatePercentChange(100, 100)).toBe('+0.00%');
      expect(calculatePercentChange(100, 0)).toBe('N/A');
      expect(calculatePercentChange(100, null)).toBe('N/A');
    });
  });
});

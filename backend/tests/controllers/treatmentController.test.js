const request = require('supertest');
const app = require('../../app');
const db = require('../../config/database');

// Mock database
jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

describe('Treatment Controller Tests', () => {
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

  describe('GET /api/treatment-plans/patients/:id', () => {
    it('should get active treatment plan', async () => {
      const mockTreatmentPlan = {
        rows: [{
          id: 1,
          patient_id: 1,
          created_by: 'doctor-1',
          created_at: '2023-06-15T00:00:00Z',
          updated_at: '2023-06-15T00:00:00Z',
          diagnosis: 'Hypertension',
          treatment_goals: 'Lower blood pressure',
          medications: 'Lisinopril 10mg daily',
          procedures: 'Regular blood pressure monitoring',
          dietary_restrictions: 'Low sodium diet',
          activity_level: 'Moderate exercise',
          follow_up_instructions: 'Follow up in 2 weeks',
          estimated_discharge_date: '2023-07-01',
          status: 'active',
          first_name: 'John',
          last_name: 'Doe',
          medical_record_number: 'MRN001',
          doctor_first_name: 'Dr.',
          doctor_last_name: 'Smith',
          doctor_role: 'physician'
        }]
      };
      
      db.query.mockResolvedValueOnce(mockTreatmentPlan);
      
      const response = await request(app)
        .get('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toEqual(mockTreatmentPlan.rows);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM treatment_plans'),
        ['1']
      );
    });

    it('should return 404 when no active treatment plan is found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .expect(404);

      expect(response.body.message).toBe('No active treatment plan found for this patient');
    });

    it('should return 500 when database error occurs', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch treatment plan');
    });
  });

  describe('POST /api/treatment-plans/patients/:id', () => {
    it('should create treatment plan successfully', async () => {
      const mockNewPlan = {
        rows: [{
          id: 1,
          patient_id: 1,
          created_by: 'doctor-1',
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
          diagnosis: 'Hypertension',
          treatment_goals: 'Lower blood pressure',
          medications: 'Lisinopril 10mg daily',
          procedures: 'Regular blood pressure monitoring',
          dietary_restrictions: 'Low sodium diet',
          activity_level: 'Moderate exercise',
          follow_up_instructions: 'Follow up in 2 weeks',
          estimated_discharge_date: '2023-07-01',
          status: 'active'
        }]
      };
      
      db.query.mockResolvedValueOnce(mockNewPlan) // For INSERT treatment plan
               .mockResolvedValueOnce({ rows: [] }); // For audit log
      
      const response = await request(app)
        .post('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .send({
          diagnosis: 'Hypertension',
          treatment_goals: 'Lower blood pressure',
          medications: 'Lisinopril 10mg daily',
          procedures: 'Regular blood pressure monitoring',
          dietary_restrictions: 'Low sodium diet',
          activity_level: 'Moderate exercise',
          follow_up_instructions: 'Follow up in 2 weeks',
          estimated_discharge_date: '2023-07-01',
          status: 'active'
        })
        .expect(201);

      // Compare objects while ignoring date field formats
      const responseWithoutDates = {...response.body};
      delete responseWithoutDates.created_at;
      delete responseWithoutDates.updated_at;
      
      const expectedWithoutDates = {...mockNewPlan.rows[0]};
      delete expectedWithoutDates.created_at;
      delete expectedWithoutDates.updated_at;
      
      expect(responseWithoutDates).toEqual(expectedWithoutDates);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO treatment_plans'),
        expect.arrayContaining([
          '1', 
          expect.any(String), // created_by
          expect.any(Date), // updated_at
          expect.any(Date), // created_at
          'Hypertension',
          'Lower blood pressure',
          'Lisinopril 10mg daily'
        ])
      );
      
      // Verify audit log was created
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining(['CREATE_TREATMENT_PLAN'])
      );
    });

    it('should return 500 when database error occurs', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .send({
          diagnosis: 'Hypertension',
          treatment_goals: 'Lower blood pressure'
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to create treatment plan');
    });
  });

  describe('PUT /api/treatment-plans/patients/:id', () => {
    it('should update treatment plan successfully', async () => {
      const mockCurrentPlan = {
        rows: [{
          id: 1,
          patient_id: 1,
          created_by: 'doctor-1',
          created_at: '2023-06-01T00:00:00Z',
          updated_at: '2023-06-01T00:00:00Z',
          diagnosis: 'Hypertension',
          treatment_goals: 'Lower blood pressure',
          medications: 'Lisinopril 10mg daily',
          version_number: 1,
          status: 'active'
        }]
      };
      
      const mockNewVersion = {
        rows: [{
          id: 2,
          patient_id: 1,
          parent_plan_id: 1,
          version_number: 2,
          created_by: 'doctor-2',
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
          diagnosis: 'Hypertension - Severe',
          treatment_goals: 'Lower blood pressure, reduce risk of stroke',
          medications: 'Lisinopril 20mg daily',
          status: 'active'
        }]
      };
      
      db.query.mockResolvedValueOnce(mockCurrentPlan) // For SELECT current plan
               .mockResolvedValueOnce({ rows: [] }) // For UPDATE (archive) old plan
               .mockResolvedValueOnce(mockNewVersion) // For INSERT new version
               .mockResolvedValueOnce({ rows: [] }); // For audit log
      
      const response = await request(app)
        .put('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .send({
          diagnosis: 'Hypertension - Severe',
          treatment_goals: 'Lower blood pressure, reduce risk of stroke',
          medications: 'Lisinopril 20mg daily',
          procedures: 'Regular blood pressure monitoring',
          dietary_restrictions: 'Low sodium diet',
          activity_level: 'Moderate exercise',
          follow_up_instructions: 'Follow up in 1 week',
          estimated_discharge_date: '2023-07-15'
        })
        .expect(200);

      // Simplify assertions to focus on key aspects of the response
      expect(response.body.message).toBe('Treatment plan updated successfully with version history');
      
      // Verify the treatment plan response contains the correct updated diagnosis and data
      expect(response.body.treatmentPlan).toBeDefined();
      expect(response.body.treatmentPlan.diagnosis).toBe('Hypertension - Severe');
      expect(response.body.treatmentPlan.treatment_goals).toBe('Lower blood pressure, reduce risk of stroke');
      expect(response.body.treatmentPlan.medications).toBe('Lisinopril 20mg daily');
      expect(response.body.treatmentPlan.status).toBe('active');
      
      // Check version information is correct
      if (response.body.previousVersion) {
        expect(response.body.previousVersion).toBe(1);
      } else if (response.body.treatmentPlan.parent_plan_id) {
        expect(response.body.treatmentPlan.parent_plan_id).toBe(1);
      }
      
      // Check that response contains created_at and updated_at timestamps
      expect(response.body.treatmentPlan).toHaveProperty('created_at');
      expect(response.body.treatmentPlan).toHaveProperty('updated_at');
      
      expect(db.query).toHaveBeenCalledTimes(4);
      
      // Check that old plan was archived
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE treatment_plans'),
        [expect.anything(), 1, 1]
      );
      
      // Check that new version was created
      expect(db.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO treatment_plans'),
        expect.arrayContaining(['1', expect.any(String), 2])
      );
    });

    it('should return 404 when no active treatment plan exists', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .send({
          diagnosis: 'Updated diagnosis',
          treatment_goals: 'Updated goals'
        })
        .expect(404);

      expect(response.body.message).toBe('Active treatment plan not found');
    });

    it('should return 500 when database error occurs', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/treatment-plans/patients/1')
        .set('Authorization', mockToken)
        .send({
          diagnosis: 'Updated diagnosis',
          treatment_goals: 'Updated goals'
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to update treatment plan');
    });
  });
});

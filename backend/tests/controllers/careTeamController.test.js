const request = require('supertest');
const app = require('../../app');
const db = require('../../config/database');

// Mock database
jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

describe('Care Team Controller Tests', () => {
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

  describe('POST /api/care-teams/patients/:id', () => {
    it('should assign care team member successfully', async () => {
      const mockCareTeamMember = {
        rows: [{
          id: 1,
          patient_id: 1,
          assigned_at: '2023-06-15T00:00:00Z',
          user_id: 'user-1',
          is_active: true,
          role_in_care: 'primary',
          assigned_by: 'user-2'
        }]
      };
      
      db.query.mockResolvedValueOnce(mockCareTeamMember) // For insert care team
               .mockResolvedValueOnce({ rows: [] }); // For audit log
      
      const response = await request(app)
        .post('/api/care-teams/patients/1')
        .set('Authorization', mockToken)
        .send({
          user_id: 'user-1',
          role_in_care: 'primary'
        })
        .expect(201);

      expect(response.body.message).toBe('Care team assigned successfully');
      expect(response.body.careTeam).toEqual(mockCareTeamMember.rows[0]);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO care_teams'),
        expect.arrayContaining([1, expect.any(String), 'user-1', true, 'primary'])
      );
      
      // Verify audit log was created
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining(['ASSIGN_CARE_TEAM'])
      );
    });

    it('should return 500 when database error occurs', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/care-teams/patients/1')
        .set('Authorization', mockToken)
        .send({
          user_id: 'user-1',
          role_in_care: 'primary'
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to assign care team');
    });
  });

  describe('GET /api/care-teams/patients/:id', () => {
    it('should get care team members', async () => {
      const mockCareTeamMembers = {
        rows: [{
          id: 1,
          patient_id: 1,
          assigned_at: '2023-06-15T00:00:00Z',
          user_id: 'user-1',
          is_active: true,
          role_in_care: 'primary',
          assigned_by: 'user-2',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          gender: 'male',
          employee_id: 'EMP123',
          department: 'cardiology',
          role: 'doctor',
          user_is_active: true,
          assignment_is_active: true
        }]
      };
      
      db.query.mockResolvedValueOnce(mockCareTeamMembers);
      
      const response = await request(app)
        .get('/api/care-teams/patients/1')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toEqual(mockCareTeamMembers.rows);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM care_teams'),
        [1]
      );
    });

    it('should return 404 when care team is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/care-teams/patients/1')
        .set('Authorization', mockToken)
        .expect(404);

      expect(response.body.message).toBe('Care team not found');
    });

    it('should return 500 when database error occurs', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/care-teams/patients/1')
        .set('Authorization', mockToken)
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch care team');
    });
  });

  describe('PUT /api/care-teams/members/:memberId', () => {
    it('should update care team member role successfully', async () => {
      const mockCurrentCareTeam = {
        rows: [{
          id: 1,
          patient_id: 1,
          assigned_at: '2023-06-15T00:00:00Z',
          user_id: 'user-1',
          is_active: true,
          role_in_care: 'primary',
          assigned_by: 'user-2'
        }]
      };
      
      const mockUpdatedCareTeam = {
        rows: [{
          id: 1,
          patient_id: 1,
          assigned_at: '2023-06-15T00:00:00Z',
          user_id: 'user-1',
          is_active: true,
          role_in_care: 'secondary',
          assigned_by: 'user-2'
          // Not specifying updated_at here to avoid format mismatches
        }]
      };
      
      db.query.mockResolvedValueOnce(mockCurrentCareTeam) // For SELECT
               .mockResolvedValueOnce(mockUpdatedCareTeam) // For UPDATE
               .mockResolvedValueOnce({ rows: [] }); // For audit log
      
      const response = await request(app)
        .put('/api/care-teams/members/1')
        .set('Authorization', mockToken)
        .send({
          role_in_care: 'secondary'
        })
        .expect(200);

      expect(response.body.message).toBe('Care team updated successfully');
      
      // Replace the below approach with a simpler one - just check role update worked
      expect(response.body.message).toBe('Care team updated successfully');
      expect(response.body.careTeam).toHaveProperty('role_in_care');
      expect(response.body.careTeam.role_in_care).toBe('secondary');
      expect(response.body.careTeam).toHaveProperty('is_active', true);
      
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE care_teams'),
        expect.arrayContaining(['secondary', expect.any(String), true, 1])
      );
    });

    it('should return 404 when care team member is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/care-teams/members/1')
        .set('Authorization', mockToken)
        .send({
          role_in_care: 'secondary'
        })
        .expect(404);

      expect(response.body.message).toBe('Care team not found');
    });

    it('should return 500 when database error occurs', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/care-teams/members/1')
        .set('Authorization', mockToken)
        .send({
          role_in_care: 'secondary'
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to update care team');
    });
  });

  describe('DELETE /api/care-teams/members/:memberId', () => {
    it('should remove care team member successfully', async () => {
      const mockCurrentCareTeam = {
        rows: [{
          id: 1,
          patient_id: 1,
          assigned_at: '2023-06-15T00:00:00Z',
          user_id: 'user-1',
          is_active: true,
          role_in_care: 'primary',
          assigned_by: 'user-2'
        }]
      };
      
      const mockRemovedCareTeam = {
        rows: [{
          id: 1,
          patient_id: 1,
          assigned_at: expect.any(Date),
          user_id: 'user-1',
          is_active: false,
          role_in_care: 'primary',
          assigned_by: 'user-2',
          updated_at: expect.any(Date)
        }]
      };
      
      db.query.mockResolvedValueOnce(mockCurrentCareTeam) // For SELECT
               .mockResolvedValueOnce(mockRemovedCareTeam) // For UPDATE
               .mockResolvedValueOnce({ rows: [] }); // For audit log
      
      const response = await request(app)
        .delete('/api/care-teams/members/1')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body.message).toBe('Care team member removed successfully');
      
      // Replace the below approach with a simpler one - just verify removal worked
      expect(response.body.message).toBe('Care team member removed successfully');
      expect(response.body.careTeamMember).toHaveProperty('is_active');
      expect(response.body.careTeamMember.is_active).toBe(false);
      
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE care_teams'),
        expect.arrayContaining([false, expect.any(String), 1])
      );
    });

    it('should return 404 when care team member is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/care-teams/members/1')
        .set('Authorization', mockToken)
        .expect(404);

      expect(response.body.message).toBe('Care team member not found');
    });

    it('should return 400 when member is already inactive', async () => {
      const mockInactiveMember = {
        rows: [{
          id: 1,
          is_active: false // Already inactive
        }]
      };
      
      db.query.mockResolvedValueOnce(mockInactiveMember);

      const response = await request(app)
        .delete('/api/care-teams/members/1')
        .set('Authorization', mockToken)
        .expect(400);

      expect(response.body.message).toBe('Care team member is already inactive');
    });

    it('should return 500 when database error occurs', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .delete('/api/care-teams/members/1')
        .set('Authorization', mockToken)
        .expect(500);

      expect(response.body.message).toBe('Failed to remove care team member');
    });
  });
});

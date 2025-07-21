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

describe('Notes Controller Tests', () => {
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

  describe('GET /api/notes/patients/:id/notes', () => {
    it('should return patient notes', async () => {
      const mockNotes = {
        rows: [
          {
            id: 1,
            patient_id: 1,
            content: 'Initial assessment completed',
            created_by: 'test-user-id',
            created_at: '2023-06-15T10:30:00Z',
            note_type: 'clinical'
          }
        ]
      };

      db.query.mockResolvedValue(mockNotes);

      const response = await request(app)
        .get('/api/notes/patients/1/notes')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toEqual(mockNotes.rows);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM notes'),
        expect.any(Array)
      );
      // Second call for audit logging
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should filter notes by type', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/notes/patients/1/notes?type=clinical')
        .set('Authorization', mockToken)
        .expect(200);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE notes.patient_id = $1 AND notes.note_type = $2'),
        expect.arrayContaining(['1', 'clinical'])
      );
    });

    it('should handle pagination', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/notes/patients/1/notes?page=2')
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
        .get('/api/notes/patients/1/notes')
        .set('Authorization', mockToken)
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch patients notes');
    });
  });

  describe('POST /api/notes/patients/:id/notes', () => {
    it('should create new note successfully', async () => {
      const noteData = {
        content: 'Patient reported feeling better today',
        note_type: 'clinical'
      };

      const mockCreatedNote = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Patient reported feeling better today',
          created_by: 'test-user-id',
          created_at: '2023-06-15T10:30:00Z',
          note_type: 'clinical'
        }]
      };

      db.query.mockResolvedValueOnce(mockCreatedNote); // First call to insert note
      db.query.mockResolvedValueOnce({ rows: [] }); // Second call for audit logging

      const response = await request(app)
        .post('/api/notes/patients/1/notes')
        .set('Authorization', mockToken)
        .send(noteData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Note created successfully');
      expect(response.body).toHaveProperty('note');
      expect(response.body.note).toEqual(mockCreatedNote.rows[0]);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notes'),
        expect.any(Array)
      );
      
      // Check for audit log
      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO audit_logs/),
        expect.any(Array)
      );
    });

    it('should return 400 when content is missing', async () => {
      const invalidNoteData = {
        note_type: 'clinical'
        // Missing content
      };

      const response = await request(app)
        .post('/api/notes/patients/1/notes')
        .set('Authorization', mockToken)
        .send(invalidNoteData)
        .expect(400);

      expect(response.body.message).toContain('Content is required');
    });

    it('should return 500 when note creation fails', async () => {
      const noteData = {
        content: 'Patient reported feeling better today',
        note_type: 'clinical'
      };

      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/notes/patients/1/notes')
        .set('Authorization', mockToken)
        .send(noteData)
        .expect(500);

      expect(response.body.message).toBe('Failed to create note');
    });
  });

  describe('GET /api/notes/patients/:id/notes/:noteId', () => {
    it('should return a specific note', async () => {
      const mockNote = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Patient reported feeling better today',
          created_by: 'test-user-id',
          created_at: '2023-06-15T10:30:00Z',
          note_type: 'clinical'
        }]
      };

      db.query.mockResolvedValue(mockNote);

      const response = await request(app)
        .get('/api/notes/patients/1/notes/1')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toEqual(mockNote.rows[0]);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE notes.id = $1 AND notes.patient_id = $2'),
        expect.arrayContaining(['1', '1'])
      );
    });

    it('should return 404 for nonexistent note', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/notes/patients/1/notes/999')
        .set('Authorization', mockToken)
        .expect(404);
    });
  });

  describe('PUT /api/notes/patients/:id/notes/:noteId', () => {
    it('should update note successfully', async () => {
      const updateData = {
        content: 'Updated clinical note content',
        note_type: 'followup'
      };

      const mockBeforeUpdate = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Original content',
          created_by: 'test-user-id',
          created_at: '2023-06-15T10:30:00Z',
          note_type: 'clinical'
        }]
      };

      const mockAfterUpdate = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Updated clinical note content',
          created_by: 'test-user-id',
          created_at: '2023-06-15T10:30:00Z',
          note_type: 'followup',
          updated_at: '2023-06-16T09:00:00Z'
        }]
      };

      db.query
        .mockResolvedValueOnce(mockBeforeUpdate) // First call to get the existing note
        .mockResolvedValueOnce(mockAfterUpdate)  // Second call to update the note
        .mockResolvedValueOnce({ rows: [] });    // Third call for audit logging

      const response = await request(app)
        .put('/api/notes/patients/1/notes/1')
        .set('Authorization', mockToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Note updated successfully');
      expect(response.body).toHaveProperty('note');
      expect(response.body.note).toEqual(mockAfterUpdate.rows[0]);
      
      // Check for audit log with old values
      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO audit_logs/),
        expect.arrayContaining([expect.any(String), expect.any(String), 'UPDATE_NOTE'])
      );
    });

    it('should return 404 for nonexistent note when updating', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // No existing note found

      await request(app)
        .put('/api/notes/patients/1/notes/999')
        .set('Authorization', mockToken)
        .send({ content: 'Updated content' })
        .expect(404);
    });

    it('should return 400 when update data is invalid', async () => {
      const mockBeforeUpdate = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Original content',
          note_type: 'clinical'
        }]
      };

      db.query.mockResolvedValueOnce(mockBeforeUpdate);

      const response = await request(app)
        .put('/api/notes/patients/1/notes/1')
        .set('Authorization', mockToken)
        .send({ content: '' }) // Empty content is invalid
        .expect(400);

      expect(response.body.message).toContain('Content cannot be empty');
    });
    
    it('should return 400 when content is null in update', async () => {
      const mockBeforeUpdate = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Original content',
          note_type: 'clinical'
        }]
      };

      db.query.mockResolvedValueOnce(mockBeforeUpdate);

      const response = await request(app)
        .put('/api/notes/patients/1/notes/1')
        .set('Authorization', mockToken)
        .send({ content: null }) // Null content should be invalid
        .expect(400);

      expect(response.body.message).toContain('Content cannot be empty');
    });
    
    it('should handle database error when updating note', async () => {
      const mockBeforeUpdate = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Original content',
          note_type: 'clinical',
          version: 1
        }]
      };

      // First query succeeds (fetching the note), second one fails (updating)
      db.query.mockResolvedValueOnce(mockBeforeUpdate)
              .mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/notes/patients/1/notes/1')
        .set('Authorization', mockToken)
        .send({ content: 'Updated content' })
        .expect(500);

      expect(response.body.message).toBe('Failed to update note');
    });
  });

  describe('DELETE /api/notes/patients/:id/notes/:noteId', () => {
    it('should delete note successfully', async () => {
      const mockExistingNote = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Note to be deleted',
          created_by: 'test-user-id',
          note_type: 'clinical'
        }]
      };

      db.query
        .mockResolvedValueOnce(mockExistingNote) // First call to get the existing note
        .mockResolvedValueOnce({ rowCount: 1 }) // Second call for the delete operation
        .mockResolvedValueOnce({ rows: [] });   // Third call for audit logging

      const response = await request(app)
        .delete('/api/notes/patients/1/notes/1')
        .set('Authorization', mockToken)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Note deleted successfully');
      
      // Check delete query
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notes WHERE id = $1 AND patient_id = $2'),
        expect.arrayContaining(['1', '1'])
      );
      
      // Check for audit log
      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO audit_logs/),
        expect.arrayContaining([expect.any(String), expect.any(String), 'DELETE_NOTE'])
      );
    });

    it('should return 404 for nonexistent note when deleting', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // No existing note found

      await request(app)
        .delete('/api/notes/patients/1/notes/999')
        .set('Authorization', mockToken)
        .expect(404);
    });

    it('should return 500 when deletion fails', async () => {
      const mockExistingNote = {
        rows: [{
          id: 1,
          patient_id: 1,
          content: 'Note to be deleted',
          note_type: 'clinical'
        }]
      };

      db.query
        .mockResolvedValueOnce(mockExistingNote)
        .mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .delete('/api/notes/patients/1/notes/1')
        .set('Authorization', mockToken)
        .expect(500);

      expect(response.body.message).toBe('Failed to delete note');
    });
  });
});

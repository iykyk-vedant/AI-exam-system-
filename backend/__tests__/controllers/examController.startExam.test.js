/**
 * Integration tests for examController.startExam
 */
const { startExam } = require('../../../backend/controllers/examController');
const db = require('../../../backend/config/db');
const { generateAndStoreVariant } = require('../../../backend/services/variantService');

jest.mock('../../../backend/config/db');
jest.mock('../../../backend/services/variantService');

describe('examController.startExam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start an exam and generate variant questions', async () => {
    const mockReq = {
      params: { examId: 'exam-1' },
      user: { uid: 'student-123' }
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock exam fetch
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'exam-1',
          title: 'Test Exam',
          status: 'published',
          duration_minutes: 30,
          start_time: null,
          end_time: null
        }]
      })
      // Mock check for active attempt
      .mockResolvedValueOnce({ rows: [] })
      // Mock count previous attempts
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      // Mock create attempt
      .mockResolvedValueOnce({
        rows: [{
          id: 'attempt-1',
          exam_id: 'exam-1',
          student_uid: 'student-123',
          created_at: new Date()
        }]
      })
      // Mock get blueprints
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'bp-1',
            template_text: 'What is {{A}}?',
            options_templates: ['{{A}}', '{{A + 1}}', '{{A - 1}}', '{{A + 2}}'],
            correct_option_template: '0',
            variable_sets: { type: 'explicit', sets: [{ A: 5 }] }
          }
        ]
      })
      // Mock update total questions
      .mockResolvedValueOnce({ rows: [] });

    // Mock variant generation
    generateAndStoreVariant.mockResolvedValueOnce({
      id: 'q-1',
      blueprint_id: 'bp-1',
      question_text: 'What is 5?',
      options: ['5', '6', '4', '7'],
      question_hash: 'hash-123'
    });

    await startExam(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        attemptId: 'attempt-1',
        questions: expect.any(Array),
        timeLeft: 1800
      })
    );
  });

  it('should resume existing attempt instead of creating new one', async () => {
    const mockReq = {
      params: { examId: 'exam-1' },
      user: { uid: 'student-123' }
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock exam fetch
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'exam-1',
          title: 'Test Exam',
          status: 'published',
          duration_minutes: 30,
          start_time: null,
          end_time: null
        }]
      })
      // Mock check for active attempt - returns existing
      .mockResolvedValueOnce({
        rows: [{
          id: 'attempt-1',
          exam_id: 'exam-1',
          student_uid: 'student-123',
          created_at: new Date('2024-01-01T10:00:00Z')
        }]
      })
      // Mock get attempt questions
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'q-1',
            blueprint_id: 'bp-1',
            question_text: 'What is 5?',
            options: ['5', '6', '4', '7']
          }
        ]
      });

    await startExam(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        attemptId: 'attempt-1',
        questions: expect.any(Array)
      })
    );
    // Should NOT call generateAndStoreVariant
    expect(generateAndStoreVariant).not.toHaveBeenCalled();
  });

  it('should reject if exam has no linked blueprints', async () => {
    const mockReq = {
      params: { examId: 'exam-1' },
      user: { uid: 'student-123' }
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'exam-1',
          title: 'Test Exam',
          status: 'published',
          duration_minutes: 30,
          start_time: null,
          end_time: null
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'attempt-1',
          exam_id: 'exam-1',
          student_uid: 'student-123'
        }]
      })
      // Empty blueprints
      .mockResolvedValueOnce({ rows: [] })
      // Delete attempt
      .mockResolvedValueOnce({ rows: [] });

    await startExam(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('No blueprints have been linked')
      })
    );
  });
});

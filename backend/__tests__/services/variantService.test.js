/**
 * Unit tests for variantService
 */
const { generateAndStoreVariant } = require('../../../backend/services/variantService');
const db = require('../../../backend/config/db');

jest.mock('../../../backend/config/db');

describe('variantService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate and store a variant with deterministic seed', async () => {
    // Mock blueprint
    const blueprint = {
      id: 'bp-1',
      template_text: 'What is {{A}} + {{B}}?',
      options_templates: ['{{A + B}}', '{{A + B + 1}}', '{{A + B - 1}}', '{{A + B + 2}}'],
      correct_option_template: '0',
      variable_sets: {
        type: 'explicit',
        sets: [
          { A: 5, B: 3 },
          { A: 10, B: 7 }
        ]
      }
    };

    // Mock database query returns
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'q-1', blueprint_id: 'bp-1', question_text: 'What is 5 + 3?', options: ['8', '9', '7', '10'] }] })
      .mockResolvedValueOnce({}); // audit log insert

    const result = await generateAndStoreVariant({
      studentUid: 'student-123',
      blueprint,
      examId: 'exam-1',
      attemptId: 'attempt-1'
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('q-1');
    expect(result.question_hash).toBeDefined();
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('should generate same variant for same student and exam', async () => {
    const blueprint = {
      id: 'bp-1',
      template_text: 'What is {{A}} + {{B}}?',
      options_templates: ['{{A + B}}', '{{A + B + 1}}', '{{A + B - 1}}', '{{A + B + 2}}'],
      correct_option_template: '0',
      variable_sets: {
        type: 'explicit',
        sets: [{ A: 5, B: 3 }]
      }
    };

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'q-1', blueprint_id: 'bp-1', question_text: 'What is 5 + 3?', options: ['8', '9', '7', '10'] }] })
      .mockResolvedValueOnce({});

    // Call twice with same params
    const result1 = await generateAndStoreVariant({
      studentUid: 'student-123',
      blueprint,
      examId: 'exam-1',
      attemptId: 'attempt-1'
    });

    // Reset mocks
    db.query.mockClear();
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'q-1', blueprint_id: 'bp-1', question_text: 'What is 5 + 3?', options: ['8', '9', '7', '10'] }] })
      .mockResolvedValueOnce({});

    const result2 = await generateAndStoreVariant({
      studentUid: 'student-123',
      blueprint,
      examId: 'exam-1',
      attemptId: 'attempt-2'
    });

    // Should have same question hash (deterministic)
    expect(result1.question_hash).toBe(result2.question_hash);
  });
});

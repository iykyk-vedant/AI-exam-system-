/**
 * Unit tests for leakDetectionService
 */
const { investigateLeakByHashes } = require('../../../backend/services/leakDetectionService');
const db = require('../../../backend/config/db');

jest.mock('../../../backend/config/db');

describe('leakDetectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should investigate leak and aggregate by student', async () => {
    const leakedHashes = [
      'hash-1',
      'hash-2',
      'hash-3'
    ];

    db.query.mockResolvedValueOnce({
      rows: [
        { question_hash: 'hash-1', student_id: 'student-A', attempt_id: 'attempt-1', blueprint_id: 'bp-1', created_at: new Date() },
        { question_hash: 'hash-2', student_id: 'student-A', attempt_id: 'attempt-1', blueprint_id: 'bp-2', created_at: new Date() },
        { question_hash: 'hash-1', student_id: 'student-B', attempt_id: 'attempt-2', blueprint_id: 'bp-1', created_at: new Date() },
        { question_hash: 'hash-3', student_id: 'student-B', attempt_id: 'attempt-2', blueprint_id: 'bp-3', created_at: new Date() }
      ]
    });

    const result = await investigateLeakByHashes(leakedHashes);

    expect(result.length).toBe(2); // Two students
    expect(result[0].student_id).toBe('student-A');
    expect(result[0].uniqueMatches).toBe(2);
    expect(result[0].confidence).toBe(Math.round((2 / 3) * 100));
  });

  it('should return empty array for no matches', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const result = await investigateLeakByHashes(['hash-1', 'hash-2']);

    expect(result).toEqual([]);
  });

  it('should handle empty hash array', async () => {
    const result = await investigateLeakByHashes([]);
    expect(result).toEqual([]);
  });
});

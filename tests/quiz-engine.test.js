import test from 'node:test';
import assert from 'node:assert/strict';
import { quizConfig } from '../src/data.js';
import { calculateResult, darkVector, distance, normalizeAnswers } from '../src/quiz-engine.js';

const answers = Object.fromEntries(quizConfig.questions.map(question => [question.id, 'a']));

test('normalizes every dimension to an integer in range', () => {
  const vector = normalizeAnswers(quizConfig.questions, quizConfig.dimensions, answers);
  for (const value of Object.values(vector)) {
    assert.equal(Number.isInteger(value), true);
    assert.ok(value >= 0 && value <= 100);
  }
});

test('same answers and seed always return same result', () => {
  const first = calculateResult(quizConfig, answers, 'session-1');
  const second = calculateResult(quizConfig, answers, 'session-1');
  assert.equal(first.primary.role.id, second.primary.role.id);
  assert.equal(first.hidden.role.id, second.hidden.role.id);
  assert.notEqual(first.primary.role.id, first.hidden.role.id);
});

test('dark vector follows bounded pressure transform', () => {
  const result = darkVector({ strategy: 90, assertiveness: 90, restraint: 90, empathy: 10, ambition: 90, independence: 95, sensitivity: 99, integrity: 20 });
  assert.deepEqual(result, { strategy: 100, assertiveness: 100, restraint: 100, empathy: 0, ambition: 100, independence: 100, sensitivity: 100, integrity: 0 });
});

test('distance is zero for equal vectors', () => {
  const vector = Object.fromEntries(quizConfig.dimensions.map(({ id }) => [id, 50]));
  assert.equal(distance(vector, vector, quizConfig.dimensions), 0);
});

test('rejects incomplete answer sets', () => {
  assert.throws(() => calculateResult(quizConfig, { q1: 'a' }), /Incomplete/);
});

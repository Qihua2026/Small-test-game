const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function normalizeAnswers(questions, dimensions, answers) {
  const vector = {};
  for (const { id } of dimensions) {
    let raw = 0;
    let min = 0;
    let max = 0;
    for (const question of questions) {
      const weights = question.options.map(item => item.weights[id] ?? 0);
      min += Math.min(...weights);
      max += Math.max(...weights);
      const selected = question.options.find(item => item.id === answers[question.id]);
      if (!selected) throw new Error(`Missing or invalid answer: ${question.id}`);
      raw += selected.weights[id] ?? 0;
    }
    vector[id] = max === min ? 50 : Math.round(clamp(100 * (raw - min) / (max - min)));
  }
  return vector;
}

export function distance(a, b, dimensions, weights = {}) {
  let total = 0;
  let weightTotal = 0;
  for (const { id } of dimensions) {
    const weight = weights[id] ?? 1;
    total += weight * ((a[id] - b[id]) ** 2);
    weightTotal += weight;
  }
  return Math.sqrt(total / weightTotal);
}

export const displayMatch = distanceValue => Math.round(clamp(62 + (100 - distanceValue) * 0.33, 62, 95));

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function rankRoles(vector, roles, dimensions, seed = '') {
  const highest = [...dimensions].sort((a, b) => vector[b.id] - vector[a.id]).slice(0, 3);
  return roles.map(role => {
    const roleDistance = distance(vector, role.vector, dimensions);
    const topDifference = highest.reduce((sum, item) => sum + Math.abs(vector[item.id] - role.vector[item.id]), 0);
    return { role, distance: roleDistance, displayMatch: displayMatch(roleDistance), topDifference };
  }).sort((a, b) => {
    const difference = a.distance - b.distance;
    if (Math.abs(difference) >= 0.5) return difference;
    if (a.topDifference !== b.topDifference) return a.topDifference - b.topDifference;
    return (hash(seed + a.role.id) % 10000) - (hash(seed + b.role.id) % 10000);
  });
}

export function darkVector(vector) {
  return {
    strategy: clamp(vector.strategy + 20),
    assertiveness: clamp(vector.assertiveness + 15),
    restraint: clamp(vector.restraint + 20),
    empathy: clamp(vector.empathy - 25),
    ambition: clamp(vector.ambition + 20),
    independence: clamp(vector.independence + 10),
    sensitivity: clamp(vector.sensitivity + 5),
    integrity: clamp(vector.integrity - 30)
  };
}

export function calculateResult(config, answers, sessionId = 'local') {
  if (Object.keys(answers).length !== config.questions.length) throw new Error('Incomplete answers');
  const userVector = normalizeAnswers(config.questions, config.dimensions, answers);
  const ranked = rankRoles(userVector, config.roles, config.dimensions, `${sessionId}${config.quizVersion}`);
  const darkRanked = rankRoles(darkVector(userVector), config.roles, config.dimensions, `${sessionId}dark`);
  const primary = ranked[0];
  const hidden = ranked.find(item => item.role.id !== primary.role.id);
  const darkFirst = darkRanked[0];
  const darkAlternative = darkRanked.find(item => item.role.id !== primary.role.id);
  const dark = darkFirst.role.id !== primary.role.id || (darkAlternative.distance - darkFirst.distance >= 12)
    ? darkFirst
    : darkAlternative;
  return { userVector, primary, hidden, dark };
}

export function topDimensions(vector, dimensions, count = 3) {
  const priority = ['strategy','empathy','integrity','independence','restraint','sensitivity','assertiveness','ambition'];
  return [...dimensions].sort((a, b) => vector[b.id] - vector[a.id] || priority.indexOf(a.id) - priority.indexOf(b.id)).slice(0, count);
}

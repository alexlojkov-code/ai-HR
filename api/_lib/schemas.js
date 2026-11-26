// JSON-схемы ответов модели (Gemini responseSchema, SPEC §4–5).
const S = { type: 'STRING' };
const strList = { type: 'ARRAY', items: S };

export const PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    interviewerTitle: S,
    intro: S,
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: ['tech', 'behavioral', 'case'] },
          topic: S,
          text: S,
          keyPoints: strList,
        },
        required: ['kind', 'topic', 'text', 'keyPoints'],
      },
    },
  },
  required: ['interviewerTitle', 'intro', 'questions'],
};

export const TURN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    say: S,
    action: { type: 'STRING', enum: ['followup', 'hint', 'next', 'finish'] },
    mood: { type: 'STRING', enum: ['pleased', 'neutral', 'displeased'] },
    swore: { type: 'BOOLEAN' },
    note: S,
  },
  required: ['say', 'action', 'mood', 'swore', 'note'],
};

export const REVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    characteristic: S,
    strengths: strList,
    gaps: strList,
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          qid: S,
          score: { type: 'INTEGER' },
          reference: S,
          covered: strList,
          missed: strList,
          why: S,
        },
        required: ['qid', 'score', 'reference', 'covered', 'missed', 'why'],
      },
    },
    study: strList,
  },
  required: ['characteristic', 'strengths', 'gaps', 'items', 'study'],
};

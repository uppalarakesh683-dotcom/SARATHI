export const APP_CONFIG = {
  name: 'SARATHI',
  tagline: 'Your goal is the destination. SARATHI guides your path.',
  subTagline: 'AI-Powered Personalized Learning & Assessment Intelligence',
  version: '2.0.0-PROD',
  supportedExams: [
    { id: 'gate_cse', label: 'GATE CSE (Computer Science & IT)', popular: true },
    { id: 'college_exam', label: 'University / Semester Exam', popular: true },
    { id: 'placement', label: 'Campus Placement & Coding Tests', popular: true },
    { id: 'technical_interview', label: 'FAANG / Tier-1 Tech Interview', popular: true },
    { id: 'certification', label: 'AWS / Cloud / Database Certification', popular: false },
    { id: 'skill_development', label: 'Deep Technical Skill Mastery', popular: false },
  ],
  defaultDomain: {
    examId: 'gate_cse',
    examName: 'GATE CSE',
    subject: 'Database Management Systems (DBMS)',
    topics: [
      {
        id: 'relational_model',
        name: 'Relational Model & Relational Algebra',
        description: 'Tuples, schemas, keys, relational operators (projection, selection, join, division).',
      },
      {
        id: 'functional_dependencies',
        name: 'Functional Dependencies & Normal Forms',
        description: 'Attribute closure, canonical cover, 1NF, 2NF, 3NF, BCNF, lossless join, dependency preservation.',
      },
      {
        id: 'transactions_concurrency',
        name: 'Transactions & Concurrency Control',
        description: 'ACID properties, serializability, conflict/view serializability, 2PL, deadlock prevention.',
      },
      {
        id: 'indexing_btrees',
        name: 'Indexing & B/B+ Trees',
        description: 'Primary/secondary indexing, dense/sparse index, B+ tree insertion/deletion, fanout and depth calculations.',
      },
      {
        id: 'sql_queries',
        name: 'SQL & Query Optimization',
        description: 'Complex nested queries, joins, aggregate functions, HAVING clause, execution plans.',
      },
    ],
  },
};


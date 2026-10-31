import { Question } from '@/types/question';

export interface FixWeaknessContent {
  conceptId: string;
  conceptName: string;
  simpleExplanation: string;
  detailedExplanation: string;
  examples: {
    title: string;
    stepByStep: string[];
    takeaway: string;
  }[];
  practiceQuestions: Question[];
  retestQuestions: Question[];
}

export const SEED_WEAKNESS_CONTENT: Record<string, FixWeaknessContent> = {
  functional_dependencies: {
    conceptId: 'functional_dependencies',
    conceptName: 'Functional Dependencies & Normal Forms',
    simpleExplanation:
      'A Functional Dependency X -> Y means: "If two rows have the exact same value for X, they MUST have the same value for Y." Think of X like your Student ID, and Y like your Name. One student ID uniquely identifies one name.',
    detailedExplanation:
      'In Relational DBMS, normalization eliminates data redundancy, insertion anomalies, update anomalies, and deletion anomalies.\n\n' +
      'Key Rules for Normal Forms:\n' +
      '• 1NF: Atomic values only. No repeating groups or multi-valued attributes.\n' +
      '• 2NF: Must be in 1NF AND no Partial Dependency (no proper subset of any candidate key determines a non-prime attribute).\n' +
      '• 3NF: Must be in 2NF AND no Transitive Dependency. For every non-trivial X -> Y: either X is a Superkey OR Y is a Prime Attribute.\n' +
      '• BCNF: Stricter than 3NF. For EVERY non-trivial X -> Y, X MUST be a Superkey.\n\n' +
      'Algorithm for Attribute Closure (X+):\n' +
      '1. Initialize X+ = X.\n' +
      '2. Loop through every FD A -> B in F. If A ⊆ X+, add B to X+.\n' +
      '3. Repeat until X+ stops growing.\n' +
      '4. If X+ contains all attributes of R, then X is a Superkey. If no proper subset of X is a superkey, X is a Candidate Key!',
    examples: [
      {
        title: 'Example: Determining Candidate Keys from Closure',
        stepByStep: [
          'Given Relation R(A, B, C, D) with F = { A -> B, B -> C, C -> D, D -> A }.',
          'Step 1: Check which attribute never appears on RHS. None! All appear on RHS.',
          'Step 2: Check (A)+ = {A, B, C, D}. All attributes derived! A is a Candidate Key.',
          'Step 3: Since D -> A, replace A with D: (D)+ = {D, A, B, C}. D is a Candidate Key.',
          'Step 4: Since C -> D, replace D with C: (C)+ = {C, D, A, B}. C is a Candidate Key.',
          'Step 5: Since B -> C, replace C with B: (B)+ = {B, C, D, A}. B is a Candidate Key.',
          'Conclusion: There are 4 candidate keys: A, B, C, D.',
        ],
        takeaway:
          'When cyclic dependencies exist, follow the dependency chain backwards to discover alternative candidate keys.',
      },
      {
        title: 'Example: Why 3NF allows prime attribute on RHS, but BCNF does not',
        stepByStep: [
          'Given R(Street, City, ZipCode) with FDs: { (Street, City) -> ZipCode, ZipCode -> City }.',
          'Candidate keys: (Street, City) and (Street, ZipCode).',
          'Prime attributes: {Street, City, ZipCode}. Non-prime attributes: None.',
          'Check ZipCode -> City: ZipCode is NOT a superkey, but City is a prime attribute!',
          'Verdict: R is in 3NF (satisfied because City is prime), but NOT in BCNF (because ZipCode is not a superkey).',
        ],
        takeaway:
          'BCNF eliminates all redundancy from functional dependencies, but decomposing into BCNF may lose dependency preservation. 3NF always guarantees dependency preservation and lossless join.',
      },
    ],
    practiceQuestions: [
      {
        id: 'fix-fd-easy-01',
        subject: 'DBMS',
        topic: 'Functional Dependencies',
        subtopic: 'Attribute Closure',
        conceptId: 'functional_dependencies',
        type: 'mcq',
        difficulty: 'easy',
        question: 'Given relation R(A, B, C) with FD { A -> B, B -> C }. What is the attribute closure (A)+?',
        options: [
          { id: 'opt_1', text: '{A}' },
          { id: 'opt_2', text: '{A, B}' },
          { id: 'opt_3', text: '{A, B, C}' },
          { id: 'opt_4', text: '{B, C}' },
        ],
        correctAnswers: ['opt_3'],
        explanation: 'Start with (A)+ = {A}. Using A -> B, we add B: {A, B}. Using B -> C, we add C: {A, B, C}. Thus (A)+ = {A, B, C}.',
        whyCorrect: 'Transitivity applies: A determines B, and B determines C, so A determines all attributes.',
        tags: ['Closure', 'Easy Practice'],
      },
      {
        id: 'fix-fd-med-02',
        subject: 'DBMS',
        topic: 'Normalization',
        subtopic: '2NF Check',
        conceptId: 'functional_dependencies',
        type: 'mcq',
        difficulty: 'medium',
        question: 'Relation R(A, B, C, D) has candidate key AB. Which functional dependency would violate 2NF?',
        options: [
          { id: 'opt_1', text: 'AB -> C' },
          { id: 'opt_2', text: 'A -> C' },
          { id: 'opt_3', text: 'C -> D' },
          { id: 'opt_4', text: 'AB -> D' },
        ],
        correctAnswers: ['opt_2'],
        explanation: 'A is a proper subset of candidate key AB. In A -> C, a proper subset of candidate key determines non-prime attribute C, which is a Partial Dependency and directly violates 2NF.',
        whyCorrect: '2NF forbids any partial dependency where a proper subset of a candidate key determines a non-prime attribute.',
        tags: ['2NF', 'Partial Dependency'],
      },
    ],
    retestQuestions: [
      {
        id: 'retest-fd-01',
        subject: 'DBMS',
        topic: 'Functional Dependencies',
        subtopic: 'Lossless Decomposition',
        conceptId: 'functional_dependencies',
        type: 'mcq',
        difficulty: 'medium',
        question: 'Relation R(A, B, C) is decomposed into R1(A, B) and R2(B, C). Under which condition is this decomposition guaranteed to be Lossless Join?',
        options: [
          { id: 'opt_a', text: 'B -> A or B -> C holds in R' },
          { id: 'opt_b', text: 'A -> B and C -> B hold in R' },
          { id: 'opt_c', text: 'R1 ∩ R2 must be empty' },
          { id: 'opt_d', text: 'R1 ∪ R2 must have no candidate keys' },
        ],
        correctAnswers: ['opt_a'],
        explanation: 'For a binary decomposition (R1, R2) to be lossless, the common attribute (R1 ∩ R2 = B) must be a superkey in at least one of the decomposed relations, i.e., B -> R1 (B -> A) or B -> R2 (B -> C).',
        whyCorrect: 'By the Lossless Join theorem, R1 ∩ R2 -> R1 or R1 ∩ R2 -> R2 must hold.',
        whyIncorrect: {
          opt_b: 'Here B is determined by A and C, but B does not determine either, so join may produce spurious tuples.',
          opt_c: 'If common attributes are empty, the join produces a Cartesian product, which is lossy.',
          opt_d: 'Irrelevant condition.',
        },
        tags: ['Lossless Join', 'Retest'],
      },
      {
        id: 'retest-fd-02',
        subject: 'DBMS',
        topic: 'Normalization',
        subtopic: 'BCNF Violation',
        conceptId: 'functional_dependencies',
        type: 'mcq',
        difficulty: 'hard',
        question: 'Let R(W, X, Y, Z) have FDs: { WX -> Y, Y -> Z, Z -> W }. What is the minimal number of tables required to decompose R into BCNF while maintaining lossless join?',
        options: [
          { id: 'opt_a', text: '1 table (already BCNF)' },
          { id: 'opt_b', text: '2 tables' },
          { id: 'opt_c', text: '3 tables' },
          { id: 'opt_d', text: '4 tables' },
        ],
        correctAnswers: ['opt_b'],
        explanation: 'Candidate keys are WX, YX, ZX. Y -> Z and Z -> W violate BCNF because Y and Z are not superkeys. Decompose on Y -> Z: R1(Y, Z) and R2(W, X, Y). R1 is in BCNF (Y is key). In R2, keys are WX, YX. FDs holding in R2: WX -> Y. Both relations are in BCNF! Total tables = 2.',
        whyCorrect: 'A 2-table decomposition (YZ) and (WXY) eliminates non-superkey determinants while preserving lossless join.',
        tags: ['BCNF Decomposition', 'Retest'],
      },
    ],
  },
};


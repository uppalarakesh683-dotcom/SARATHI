import { DocumentMaterial } from '@/types/material';

export const SEED_MATERIALS: DocumentMaterial[] = [
  {
    id: 'mat-dbms-gate-comprehensive',
    name: 'GATE CSE — DBMS Comprehensive Notes.pdf',
    type: 'application/pdf',
    size: 2458000,
    uploadDate: new Date().toISOString(),
    chunkCount: 6,
    summary:
      'Curated revision notes covering Relational Model, Functional Dependencies, Canonical Covers, Normal Forms (1NF through BCNF), Transaction ACID properties, Concurrency schedules, and B+ Trees indexing.',
    topicsDetected: [
      'Functional Dependencies',
      'Normalization',
      'Transactions',
      'B+ Trees',
      'Relational Algebra',
      'SQL',
    ],
    status: 'ready',
    chunks: [
      {
        id: 'chunk-1',
        documentId: 'mat-dbms-gate-comprehensive',
        documentName: 'GATE CSE — DBMS Comprehensive Notes.pdf',
        topic: 'Functional Dependencies',
        content:
          'Functional Dependency (FD) is a constraint between two sets of attributes in a relation. Formally, X -> Y means if two tuples agree on attributes X, they must agree on attributes Y. Armstrong\'s Axioms: 1. Reflexivity: If Y ⊆ X, then X -> Y. 2. Augmentation: If X -> Y, then XZ -> YZ. 3. Transitivity: If X -> Y and Y -> Z, then X -> Z. Secondary rules include Union, Decomposition, and Pseudo-transitivity.',
      },
      {
        id: 'chunk-2',
        documentId: 'mat-dbms-gate-comprehensive',
        documentName: 'GATE CSE — DBMS Comprehensive Notes.pdf',
        topic: 'Normalization',
        content:
          'Normalization eliminates redundancies and update anomalies. 1NF requires attribute atomicity. 2NF requires 1NF and no partial dependencies (every non-prime attribute must be fully functionally dependent on every candidate key). 3NF requires no transitive dependencies (for X -> Y, either X is a superkey or Y is prime). BCNF requires that for every non-trivial FD X -> Y, X must be a superkey.',
      },
      {
        id: 'chunk-3',
        documentId: 'mat-dbms-gate-comprehensive',
        documentName: 'GATE CSE — DBMS Comprehensive Notes.pdf',
        topic: 'Transactions & Concurrency',
        content:
          'Transactions adhere to ACID: Atomicity, Consistency, Isolation, Durability. A schedule is conflict serializable if its precedence graph is acyclic. Conflicting operations: belonging to different transactions on the same data item where at least one is a write. Strict 2-Phase Locking (Strict 2PL) guarantees conflict serializability and avoids cascading aborts by holding all exclusive locks until commit.',
      },
      {
        id: 'chunk-4',
        documentId: 'mat-dbms-gate-comprehensive',
        documentName: 'GATE CSE — DBMS Comprehensive Notes.pdf',
        topic: 'B+ Tree Indexing',
        content:
          'B+ Tree is a self-balancing n-ary tree search structure used in storage engines. Leaf nodes contain all data keys and pointers to actual records, linked as a doubly linked list for efficient range scans. Internal nodes contain only routing keys and block pointers. For an internal node with order p: p * (pointer size) + (p - 1) * (key size) <= block size.',
      },
      {
        id: 'chunk-5',
        documentId: 'mat-dbms-gate-comprehensive',
        documentName: 'GATE CSE — DBMS Comprehensive Notes.pdf',
        topic: 'Relational Algebra',
        content:
          'Fundamental operators of Relational Algebra: Selection (σ), Projection (π), Union (∪), Set Difference (-), Cartesian Product (×), and Rename (ρ). Derived operators include Natural Join (⨝), Theta Join, and Division (÷). Division is expressed as R ÷ S = π_{R - S}(R) - π_{R - S}((π_{R - S}(R) × S) - R) and models "for all" queries.',
      },
      {
        id: 'chunk-6',
        documentId: 'mat-dbms-gate-comprehensive',
        documentName: 'GATE CSE — DBMS Comprehensive Notes.pdf',
        topic: 'SQL Optimization',
        content:
          'SQL query optimization relies on relational equivalence rules: pushing selections and projections down the query execution tree before performing joins reduces intermediate relation sizes significantly. Index scans replace full table scans when selectivity is high.',
      },
    ],
  },
];


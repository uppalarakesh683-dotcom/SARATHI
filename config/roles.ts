export interface RoleDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  defaultSkills: string[];
}

export interface RoleCategory {
  name: string;
  roles: RoleDefinition[];
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  {
    name: 'Software Development',
    roles: [
      {
        id: 'software-engineer',
        title: 'Software Engineer',
        category: 'Software Development',
        description: 'Designs, develops, and maintains scalable software systems and algorithmic solutions.',
        defaultSkills: ['Data Structures', 'Algorithms', 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks', 'System Design', 'Git'],
      },
      {
        id: 'fullstack-developer',
        title: 'Full Stack Developer',
        category: 'Software Development',
        description: 'Builds end-to-end web applications across client interfaces and server infrastructure.',
        defaultSkills: ['HTML/CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'REST APIs', 'SQL & NoSQL', 'Git', 'System Design'],
      },
      {
        id: 'frontend-developer',
        title: 'Frontend Developer',
        category: 'Software Development',
        description: 'Creates responsive, accessible, high-performance web user interfaces.',
        defaultSkills: ['HTML5', 'CSS3 / Tailwind', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Web Performance', 'State Management'],
      },
      {
        id: 'backend-developer',
        title: 'Backend Developer',
        category: 'Software Development',
        description: 'Constructs robust server architectures, business logic, microservices, and APIs.',
        defaultSkills: ['Node.js', 'Python / Go', 'REST & GraphQL APIs', 'DBMS & SQL', 'Caching / Redis', 'Microservices', 'Authentication', 'System Design'],
      },
      {
        id: 'mobile-app-developer',
        title: 'Mobile App Developer',
        category: 'Software Development',
        description: 'Develops cross-platform or native smartphone applications.',
        defaultSkills: ['React Native / Flutter', 'Mobile UI Design', 'State Management', 'REST APIs', 'Offline Storage', 'App Store Deployment'],
      },
      {
        id: 'android-developer',
        title: 'Android Developer',
        category: 'Software Development',
        description: 'Builds native Android applications using modern Kotlin frameworks.',
        defaultSkills: ['Kotlin', 'Android SDK', 'Jetpack Compose', 'Coroutines', 'Room Database', 'Retrofit', 'MVVM Architecture'],
      },
      {
        id: 'ios-developer',
        title: 'iOS Developer',
        category: 'Software Development',
        description: 'Engineers native Apple ecosystem applications using Swift and SwiftUI.',
        defaultSkills: ['Swift', 'SwiftUI', 'UIKit', 'Combine', 'CoreData', 'URLSession', 'iOS Architecture Patterns'],
      },
      {
        id: 'react-developer',
        title: 'React Developer',
        category: 'Software Development',
        description: 'Specializes in component architectures, hooks, and complex web clients.',
        defaultSkills: ['React.js', 'TypeScript', 'Custom Hooks', 'Redux / Zustand', 'Next.js', 'Performance Optimization', 'Unit Testing'],
      },
      {
        id: 'nextjs-developer',
        title: 'Next.js Developer',
        category: 'Software Development',
        description: 'Builds modern SSR, SSG, and edge-native fullstack web applications.',
        defaultSkills: ['Next.js App Router', 'Server Components (RSC)', 'TypeScript', 'Server Actions', 'Tailwind CSS', 'API Routes', 'Vercel Deployment'],
      },
      {
        id: 'nodejs-developer',
        title: 'Node.js Developer',
        category: 'Software Development',
        description: 'Builds asynchronous, event-driven backend microservices and APIs.',
        defaultSkills: ['Node.js Event Loop', 'Express / Fastify', 'TypeScript', 'PostgreSQL / MongoDB', 'WebSockets', 'Async Programming', 'Docker'],
      },
    ],
  },
  {
    name: 'Programming Language Roles',
    roles: [
      {
        id: 'java-developer',
        title: 'Java Developer',
        category: 'Programming Language Roles',
        description: 'Builds enterprise-grade backends using Java and the Spring ecosystem.',
        defaultSkills: ['Core Java', 'OOP', 'Collections', 'Multithreading', 'Java 8+ Features', 'Spring Boot', 'Hibernate / JPA', 'SQL / DBMS', 'REST APIs'],
      },
      {
        id: 'python-developer',
        title: 'Python Developer',
        category: 'Programming Language Roles',
        description: 'Develops automation scripts, backend services, and data processing pipelines.',
        defaultSkills: ['Python Fundamentals', 'OOP in Python', 'Django / FastAPI', 'PostgreSQL', 'Data Manipulation', 'AsyncIO', 'Unit Testing'],
      },
      {
        id: 'cpp-developer',
        title: 'C++ Developer',
        category: 'Programming Language Roles',
        description: 'Constructs low-latency, high-performance systems and algorithms.',
        defaultSkills: ['Modern C++ (17/20)', 'Memory Management', 'STL Containers', 'Pointers & References', 'Multithreading', 'Data Structures', 'Algorithms'],
      },
      {
        id: 'javascript-developer',
        title: 'JavaScript Developer',
        category: 'Programming Language Roles',
        description: 'Engineers interactive browser client systems and asynchronous scripts.',
        defaultSkills: ['ES6+ Modern JS', 'Event Loop & Promises', 'DOM Manipulation', 'Async/Await', 'Functional Programming', 'Modules & Bundlers'],
      },
      {
        id: 'typescript-developer',
        title: 'TypeScript Developer',
        category: 'Programming Language Roles',
        description: 'Builds strongly-typed, scalable applications for enterprise codebases.',
        defaultSkills: ['TypeScript Generics', 'Utility Types', 'Type Guards', 'Interface Design', 'Compiler Options', 'Node & React Integration'],
      },
      {
        id: 'dotnet-developer',
        title: '.NET Developer',
        category: 'Programming Language Roles',
        description: 'Develops enterprise solutions on the Microsoft .NET and C# platform.',
        defaultSkills: ['C# Language', '.NET Core / ASP.NET', 'Entity Framework', 'LINQ', 'SQL Server', 'REST Web APIs', 'Dependency Injection'],
      },
    ],
  },
  {
    name: 'Data Roles',
    roles: [
      {
        id: 'data-analyst',
        title: 'Data Analyst',
        category: 'Data Roles',
        description: 'Transforms raw operational metrics into actionable business intelligence.',
        defaultSkills: ['SQL & Joins', 'Advanced Excel', 'Business Statistics', 'Python / Pandas', 'Power BI', 'Tableau', 'Data Visualization', 'Case Studies'],
      },
      {
        id: 'data-engineer',
        title: 'Data Engineer',
        category: 'Data Roles',
        description: 'Builds robust batch and real-time ETL pipelines and data lakes.',
        defaultSkills: ['SQL & Warehousing', 'Python', 'Apache Spark', 'Data Pipelines (Airflow)', 'Kafka', 'Data Modeling', 'Cloud Warehouses (Snowflake/BigQuery)'],
      },
      {
        id: 'data-scientist',
        title: 'Data Scientist',
        category: 'Data Roles',
        description: 'Applies statistical modeling and predictive machine learning to complex data sets.',
        defaultSkills: ['Statistical Inference', 'Python (NumPy/Pandas)', 'Scikit-Learn', 'Feature Engineering', 'Hypothesis Testing', 'Data Storytelling', 'SQL'],
      },
      {
        id: 'bi-developer',
        title: 'BI Developer',
        category: 'Data Roles',
        description: 'Designs enterprise dashboards, dimensional schemas, and automated reporting.',
        defaultSkills: ['Power BI / DAX', 'SQL Data Modeling', 'Star / Snowflake Schema', 'Tableau', 'ETL Integration', 'KPI Dashboard Design'],
      },
      {
        id: 'database-developer',
        title: 'Database Developer',
        category: 'Data Roles',
        description: 'Authors high-efficiency stored procedures, indexing strategies, and schema migrations.',
        defaultSkills: ['Advanced SQL', 'Query Optimization', 'Indexes & B-Trees', 'Transactions & ACID', 'Stored Procedures', 'PostgreSQL / MySQL'],
      },
    ],
  },
  {
    name: 'AI / ML Roles',
    roles: [
      {
        id: 'ai-engineer',
        title: 'AI Engineer',
        category: 'AI / ML Roles',
        description: 'Integrates foundation models, prompt pipelines, and autonomous AI agents into production.',
        defaultSkills: ['Python', 'LLMs & Prompt Engineering', 'RAG Architecture', 'Vector Databases', 'LangChain / LlamaIndex', 'API Integration', 'Model Evaluation'],
      },
      {
        id: 'machine-learning-engineer',
        title: 'Machine Learning Engineer',
        category: 'AI / ML Roles',
        description: 'Trains, validates, optimizes, and serves ML models in scalable cloud pipelines.',
        defaultSkills: ['Mathematics & Linear Algebra', 'Scikit-Learn', 'PyTorch / TensorFlow', 'Feature Store', 'Model Deployment (FastAPI/Docker)', 'MLOps'],
      },
      {
        id: 'gen-ai-engineer',
        title: 'Generative AI Engineer',
        category: 'AI / ML Roles',
        description: 'Builds applications utilizing diffusion, transformer architectures, and RAG systems.',
        defaultSkills: ['Transformer Architecture', 'Fine-tuning & LoRA', 'RAG Retrieval Systems', 'Embeddings & Vector Search', 'Agentic Workflows', 'Guardrails & Safety'],
      },
      {
        id: 'nlp-engineer',
        title: 'NLP Engineer',
        category: 'AI / ML Roles',
        description: 'Specializes in natural language understanding, tokenization, classification, and embeddings.',
        defaultSkills: ['Text Preprocessing', 'Tokenization', 'Hugging Face Transformers', 'Word Embeddings', 'Sentiment Analysis', 'Named Entity Recognition'],
      },
      {
        id: 'computer-vision-engineer',
        title: 'Computer Vision Engineer',
        category: 'AI / ML Roles',
        description: 'Develops image classification, object detection, and visual spatial algorithms.',
        defaultSkills: ['OpenCV', 'Convolutional Networks (CNN)', 'PyTorch', 'Object Detection (YOLO)', 'Image Segmentation', 'Model Quantization'],
      },
    ],
  },
  {
    name: 'Cloud / DevOps',
    roles: [
      {
        id: 'cloud-engineer',
        title: 'Cloud Engineer',
        category: 'Cloud / DevOps',
        description: 'Architects and operates multi-region infrastructure across public cloud platforms.',
        defaultSkills: ['Cloud Fundamentals', 'Virtual Networks / VPC', 'Compute / VMs / Containers', 'Storage & IAM', 'Terraform', 'Linux Administration'],
      },
      {
        id: 'aws-cloud-engineer',
        title: 'AWS Cloud Engineer',
        category: 'Cloud / DevOps',
        description: 'Deploys and manages solutions using Amazon Web Services infrastructure.',
        defaultSkills: ['AWS EC2 & S3', 'AWS Lambda (Serverless)', 'VPC Networking', 'IAM Security', 'CloudFormation / CDK', 'Amazon RDS'],
      },
      {
        id: 'azure-cloud-engineer',
        title: 'Azure Cloud Engineer',
        category: 'Cloud / DevOps',
        description: 'Constructs Microsoft Azure hybrid and enterprise cloud architectures.',
        defaultSkills: ['Azure Virtual Machines', 'Azure Entra ID / IAM', 'Azure App Services', 'Azure SQL', 'Bicep / ARM Templates', 'Azure Monitor'],
      },
      {
        id: 'devops-engineer',
        title: 'DevOps Engineer',
        category: 'Cloud / DevOps',
        description: 'Automates CI/CD deployment pipelines, container orchestration, and monitoring.',
        defaultSkills: ['Docker & Containers', 'Kubernetes Orchestration', 'CI/CD (GitHub Actions)', 'Terraform (IaC)', 'Linux & Bash Scripting', 'Monitoring (Prometheus/Grafana)'],
      },
      {
        id: 'site-reliability-engineer',
        title: 'Site Reliability Engineer',
        category: 'Cloud / DevOps',
        description: 'Ensures system uptime, automated failover, latency budgets, and disaster recovery.',
        defaultSkills: ['SLIs / SLOs / SLAs', 'Incident Response', 'Distributed Tracing', 'Chaos Engineering', 'Linux Internals', 'Automation Scripting'],
      },
    ],
  },
  {
    name: 'Cybersecurity',
    roles: [
      {
        id: 'cybersecurity-analyst',
        title: 'Cybersecurity Analyst',
        category: 'Cybersecurity',
        description: 'Monitors threat vectors, conducts vulnerability scans, and enforces security baselines.',
        defaultSkills: ['Network Security Protocols', 'Threat Intelligence', 'SIEM Operations', 'Vulnerability Assessment', 'Incident Handling', 'Security Compliance'],
      },
      {
        id: 'security-engineer',
        title: 'Security Engineer',
        category: 'Cybersecurity',
        description: 'Implements encryption, zero-trust network boundaries, and secure code audits.',
        defaultSkills: ['Cryptography Basics', 'OWASP Top 10', 'Identity & Access Management', 'Firewalls & WAF', 'Application Security', 'Penetration Testing Tools'],
      },
      {
        id: 'soc-analyst',
        title: 'SOC Analyst',
        category: 'Cybersecurity',
        description: 'Detects real-time security anomalies and triages malware incidents.',
        defaultSkills: ['Log Analysis (Splunk/ELK)', 'Endpoint Detection (EDR)', 'Malware Triage', 'Packet Inspection (Wireshark)', 'Incident Reporting'],
      },
    ],
  },
  {
    name: 'Database',
    roles: [
      {
        id: 'database-administrator',
        title: 'Database Administrator',
        category: 'Database',
        description: 'Maintains database clustering, replication, high-availability backups, and security.',
        defaultSkills: ['PostgreSQL / MySQL Administration', 'Replication & Failover', 'Backup & Disaster Recovery', 'Performance Tuning', 'User Security & Roles'],
      },
      {
        id: 'sql-developer',
        title: 'SQL Developer',
        category: 'Database',
        description: 'Crafts complex analytical queries, window functions, and business reporting tables.',
        defaultSkills: ['Complex JOINs', 'Window Functions', 'CTEs & Subqueries', 'Query Execution Plans', 'Data Aggregation', 'Index Tuning'],
      },
    ],
  },
  {
    name: 'Testing / QA',
    roles: [
      {
        id: 'qa-engineer',
        title: 'QA Engineer',
        category: 'Testing / QA',
        description: 'Designs test matrices, exploratory edge-case validations, and bug tracking workflows.',
        defaultSkills: ['Manual Test Strategy', 'Test Case Design', 'Bug Reporting (Jira)', 'Regression Testing', 'API Testing (Postman)', 'Agile QA Process'],
      },
      {
        id: 'sdet',
        title: 'SDET (Software Development Engineer in Test)',
        category: 'Testing / QA',
        description: 'Builds automated testing frameworks, end-to-end integration suites, and performance load tests.',
        defaultSkills: ['Selenium / Playwright / Cypress', 'Python / Java / TS for Testing', 'API Automation', 'CI/CD Test Pipelines', 'Performance Testing (k6/JMeter)'],
      },
    ],
  },
  {
    name: 'Other Technology Roles',
    roles: [
      {
        id: 'systems-engineer',
        title: 'Systems Engineer',
        category: 'Other Technology Roles',
        description: 'Analyzes operating system architectures, kernel drivers, and system interfaces.',
        defaultSkills: ['Operating Systems Internals', 'Linux CLI & Shell', 'C / C++ Systems Programming', 'Networking Stack', 'Hardware Architecture'],
      },
      {
        id: 'solutions-engineer',
        title: 'Solutions Engineer',
        category: 'Other Technology Roles',
        description: 'Bridges technical system architecture with business client integration requirements.',
        defaultSkills: ['Technical Architecture', 'API Integrations', 'Client Communication', 'System Demos', 'Technical Writing', 'Problem Solving'],
      },
      {
        id: 'embedded-systems-engineer',
        title: 'Embedded Systems Engineer',
        category: 'Other Technology Roles',
        description: 'Programs microcontrollers, real-time operating systems (RTOS), and hardware firmware.',
        defaultSkills: ['Embedded C', 'Microcontroller Architecture (ARM/AVR)', 'RTOS Concepts', 'UART/SPI/I2C Protocols', 'Hardware Debugging'],
      },
    ],
  },
];

// Flat list of all predefined roles
export const ALL_ROLES: RoleDefinition[] = ROLE_CATEGORIES.flatMap((c) => c.roles);

// Fuzzy search utility for roles
export function searchRoles(query: string): RoleDefinition[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return ALL_ROLES;

  return ALL_ROLES.filter((role) => {
    return (
      role.title.toLowerCase().includes(clean) ||
      role.category.toLowerCase().includes(clean) ||
      role.description.toLowerCase().includes(clean) ||
      role.defaultSkills.some((s) => s.toLowerCase().includes(clean))
    );
  });
}

// Find role by title or id
export function getRoleByIdOrTitle(identifier: string): RoleDefinition | null {
  const clean = identifier.trim().toLowerCase();
  return (
    ALL_ROLES.find(
      (r) => r.id.toLowerCase() === clean || r.title.toLowerCase() === clean
    ) || null
  );
}


/**
 * Technical Software Engineering Interview Questions Collection
 * 
 * INTERNAL TESTING MODULE:
 * Used to verify that speech recognition, natural punctuation boundaries,
 * transcript captions, and the ISL translation pipeline accurately capture
 * complex software engineering terminology without corruption or arbitrary guesses.
 * 
 * NOTE: Not displayed in the candidate-facing UI.
 */

export interface TechnicalTestCase {
  id: string
  category: string
  question: string
  keyTerms: string[]
  expectedGlossPreview?: string
}

export const TECHNICAL_INTERVIEW_QUESTIONS: TechnicalTestCase[] = [
  // 1. Python
  {
    id: 'py-01',
    category: 'Python',
    question: 'What is the difference between a Python list and a tuple?',
    keyTerms: ['Python', 'list', 'tuple'],
    expectedGlossPreview: 'PYTHON LIST TUPLE DIFFERENCE WHAT',
  },
  {
    id: 'py-02',
    category: 'Python',
    question: 'What is the difference between synchronous and asynchronous programming in Python?',
    keyTerms: ['synchronous', 'asynchronous', 'programming', 'Python'],
    expectedGlossPreview: 'PYTHON SYNCHRONOUS ASYNCHRONOUS PROGRAMMING DIFFERENCE WHAT',
  },
  {
    id: 'py-03',
    category: 'Python',
    question: 'How do Python generators and decorators work in production?',
    keyTerms: ['Python', 'generators', 'decorators'],
    expectedGlossPreview: 'PYTHON GENERATORS DECORATORS WORK HOW',
  },

  // 2. SQL & PostgreSQL
  {
    id: 'sql-01',
    category: 'SQL and PostgreSQL',
    question: 'Explain how SQL joins work.',
    keyTerms: ['SQL', 'joins', 'work'],
    expectedGlossPreview: 'SQL JOINS WORK HOW EXPLAIN',
  },
  {
    id: 'sql-02',
    category: 'SQL and PostgreSQL',
    question: 'What is the purpose of PostgreSQL indexing?',
    keyTerms: ['PostgreSQL', 'indexing', 'purpose'],
    expectedGlossPreview: 'POSTGRESQL INDEXING PURPOSE WHAT',
  },
  {
    id: 'sql-03',
    category: 'SQL and PostgreSQL',
    question: 'How do ACID transactions maintain data consistency in PostgreSQL?',
    keyTerms: ['ACID', 'transactions', 'consistency', 'PostgreSQL'],
    expectedGlossPreview: 'POSTGRESQL ACID TRANSACTIONS CONSISTENCY HOW',
  },

  // 3. FastAPI
  {
    id: 'fastapi-01',
    category: 'FastAPI',
    question: 'How does FastAPI handle dependency injection?',
    keyTerms: ['FastAPI', 'dependency injection', 'handle'],
    expectedGlossPreview: 'FASTAPI DEPENDENCY INJECTION HANDLE HOW',
  },
  {
    id: 'fastapi-02',
    category: 'FastAPI',
    question: 'How does FastAPI use Pydantic models for request validation?',
    keyTerms: ['FastAPI', 'Pydantic', 'validation'],
    expectedGlossPreview: 'FASTAPI PYDANTIC VALIDATION HOW',
  },
  {
    id: 'fastapi-03',
    category: 'FastAPI',
    question: 'Explain how asynchronous path operations function in FastAPI.',
    keyTerms: ['asynchronous', 'path operations', 'FastAPI'],
    expectedGlossPreview: 'FASTAPI ASYNCHRONOUS OPERATIONS FUNCTION HOW EXPLAIN',
  },

  // 4. REST APIs
  {
    id: 'rest-01',
    category: 'REST APIs',
    question: 'Explain how REST APIs communicate with a frontend.',
    keyTerms: ['REST', 'APIs', 'communicate', 'frontend'],
    expectedGlossPreview: 'REST APIS FRONTEND COMMUNICATE HOW EXPLAIN',
  },
  {
    id: 'rest-02',
    category: 'REST APIs',
    question: 'What are idempotent HTTP methods in RESTful API design?',
    keyTerms: ['idempotent', 'HTTP methods', 'RESTful'],
    expectedGlossPreview: 'RESTFUL IDEMPOTENT HTTP METHODS WHAT',
  },
  {
    id: 'rest-03',
    category: 'REST APIs',
    question: 'How do status codes 200, 201, 400, and 404 differ in REST APIs?',
    keyTerms: ['status codes', 'REST APIs', '200', '404'],
    expectedGlossPreview: 'REST APIS STATUS CODES DIFFER HOW',
  },

  // 5. React & JavaScript
  {
    id: 'react-01',
    category: 'React and JavaScript',
    question: 'How does React manage component state?',
    keyTerms: ['React', 'component state', 'manage'],
    expectedGlossPreview: 'REACT COMPONENT STATE MANAGE HOW',
  },
  {
    id: 'react-02',
    category: 'React and JavaScript',
    question: 'Explain the difference between useEffect and useLayoutEffect in React.',
    keyTerms: ['useEffect', 'useLayoutEffect', 'React'],
    expectedGlossPreview: 'REACT USEEFFECT USELAYOUTEFFECT DIFFERENCE EXPLAIN',
  },
  {
    id: 'react-03',
    category: 'React and JavaScript',
    question: 'How does the JavaScript event loop handle promises and microtasks?',
    keyTerms: ['JavaScript', 'event loop', 'promises', 'microtasks'],
    expectedGlossPreview: 'JAVASCRIPT EVENT LOOP PROMISES MICROTASKS HANDLE HOW',
  },

  // 6. TypeScript
  {
    id: 'ts-01',
    category: 'TypeScript',
    question: 'What is the difference between an interface and a type alias in TypeScript?',
    keyTerms: ['interface', 'type alias', 'TypeScript'],
    expectedGlossPreview: 'TYPESCRIPT INTERFACE TYPE ALIAS DIFFERENCE WHAT',
  },
  {
    id: 'ts-02',
    category: 'TypeScript',
    question: 'Explain generics and conditional types in TypeScript.',
    keyTerms: ['generics', 'conditional types', 'TypeScript'],
    expectedGlossPreview: 'TYPESCRIPT GENERICS CONDITIONAL TYPES EXPLAIN',
  },
  {
    id: 'ts-03',
    category: 'TypeScript',
    question: 'How does TypeScript handle union and intersection types?',
    keyTerms: ['union', 'intersection', 'types', 'TypeScript'],
    expectedGlossPreview: 'TYPESCRIPT UNION INTERSECTION TYPES HANDLE HOW',
  },

  // 7. Machine Learning
  {
    id: 'ml-01',
    category: 'Machine learning',
    question: 'Explain the difference between supervised and unsupervised learning.',
    keyTerms: ['supervised', 'unsupervised', 'learning'],
    expectedGlossPreview: 'SUPERVISED UNSUPERVISED LEARNING DIFFERENCE EXPLAIN',
  },
  {
    id: 'ml-02',
    category: 'Machine learning',
    question: 'What is overfitting and how do you prevent it in machine learning models?',
    keyTerms: ['overfitting', 'machine learning', 'prevent'],
    expectedGlossPreview: 'MACHINE LEARNING OVERFITTING PREVENT HOW WHAT',
  },
  {
    id: 'ml-03',
    category: 'Machine learning',
    question: 'How do precision and recall evaluate classification model performance?',
    keyTerms: ['precision', 'recall', 'classification'],
    expectedGlossPreview: 'PRECISION RECALL CLASSIFICATION PERFORMANCE HOW',
  },

  // 8. Neural Networks
  {
    id: 'nn-01',
    category: 'Neural networks',
    question: 'How does backpropagation update weights in a neural network?',
    keyTerms: ['backpropagation', 'weights', 'neural network'],
    expectedGlossPreview: 'NEURAL NETWORK BACKPROPAGATION WEIGHTS UPDATE HOW',
  },
  {
    id: 'nn-02',
    category: 'Neural networks',
    question: 'What is the role of activation functions like ReLU in deep neural networks?',
    keyTerms: ['activation functions', 'ReLU', 'neural networks'],
    expectedGlossPreview: 'DEEP NEURAL NETWORKS RELU ACTIVATION FUNCTIONS ROLE WHAT',
  },
  {
    id: 'nn-03',
    category: 'Neural networks',
    question: 'Explain the transformer architecture and self-attention mechanism in neural networks.',
    keyTerms: ['transformer', 'self-attention', 'neural networks'],
    expectedGlossPreview: 'NEURAL NETWORKS TRANSFORMER ARCHITECTURE SELF ATTENTION EXPLAIN',
  },

  // 9. Embeddings & Vector Databases
  {
    id: 'vec-01',
    category: 'Embeddings and vector databases',
    question: 'What are embeddings and how are they used in vector databases?',
    keyTerms: ['embeddings', 'vector databases'],
    expectedGlossPreview: 'EMBEDDINGS VECTOR DATABASES USED HOW WHAT',
  },
  {
    id: 'vec-02',
    category: 'Embeddings and vector databases',
    question: 'How does cosine similarity calculate distance between high-dimensional vector embeddings?',
    keyTerms: ['cosine similarity', 'vector embeddings', 'distance'],
    expectedGlossPreview: 'VECTOR EMBEDDINGS COSINE SIMILARITY DISTANCE CALCULATE HOW',
  },
  {
    id: 'vec-03',
    category: 'Embeddings and vector databases',
    question: 'Explain how approximate nearest neighbor search works in vector databases.',
    keyTerms: ['approximate nearest neighbor', 'vector databases', 'search'],
    expectedGlossPreview: 'VECTOR DATABASES NEAREST NEIGHBOR SEARCH WORKS HOW EXPLAIN',
  },

  // 10. Cloud Deployment
  {
    id: 'cloud-01',
    category: 'Cloud deployment',
    question: 'How do containerized applications scale in a cloud environment?',
    keyTerms: ['containerized', 'applications', 'scale', 'cloud'],
    expectedGlossPreview: 'CLOUD CONTAINERIZED APPLICATIONS SCALE HOW',
  },
  {
    id: 'cloud-02',
    category: 'Cloud deployment',
    question: 'What is the role of reverse proxies and load balancers in cloud deployment?',
    keyTerms: ['reverse proxies', 'load balancers', 'cloud deployment'],
    expectedGlossPreview: 'CLOUD DEPLOYMENT REVERSE PROXIES LOAD BALANCERS ROLE WHAT',
  },
  {
    id: 'cloud-03',
    category: 'Cloud deployment',
    question: 'Explain the difference between horizontal and vertical auto-scaling in cloud architecture.',
    keyTerms: ['horizontal', 'vertical', 'auto-scaling', 'cloud'],
    expectedGlossPreview: 'CLOUD HORIZONTAL VERTICAL AUTO SCALING DIFFERENCE EXPLAIN',
  },

  // 11. Authentication & Authorization
  {
    id: 'auth-01',
    category: 'Authentication and authorization',
    question: 'What is the difference between authentication and authorization?',
    keyTerms: ['authentication', 'authorization', 'difference'],
    expectedGlossPreview: 'AUTHENTICATION AUTHORIZATION DIFFERENCE WHAT',
  },
  {
    id: 'auth-02',
    category: 'Authentication and authorization',
    question: 'How do JWT access tokens and refresh tokens work together securely?',
    keyTerms: ['JWT', 'access tokens', 'refresh tokens'],
    expectedGlossPreview: 'JWT ACCESS REFRESH TOKENS SECURELY WORK HOW',
  },
  {
    id: 'auth-03',
    category: 'Authentication and authorization',
    question: 'Explain role-based access control and OAuth2 authorization flows.',
    keyTerms: ['role-based access control', 'OAuth2', 'authorization flows'],
    expectedGlossPreview: 'ROLE BASED ACCESS CONTROL OAUTH2 AUTHORIZATION FLOWS EXPLAIN',
  },

  // 12. Docker & Git
  {
    id: 'devops-01',
    category: 'Docker and Git',
    question: 'What is the difference between a Docker image and a Docker container?',
    keyTerms: ['Docker image', 'Docker container', 'difference'],
    expectedGlossPreview: 'DOCKER IMAGE DOCKER CONTAINER DIFFERENCE WHAT',
  },
  {
    id: 'devops-02',
    category: 'Docker and Git',
    question: 'Explain git rebase versus git merge in team collaboration.',
    keyTerms: ['git rebase', 'git merge', 'team collaboration'],
    expectedGlossPreview: 'GIT REBASE GIT MERGE COLLABORATION EXPLAIN',
  },
  {
    id: 'devops-03',
    category: 'Docker and Git',
    question: 'How do multi-stage Docker builds optimize container images?',
    keyTerms: ['multi-stage', 'Docker builds', 'optimize'],
    expectedGlossPreview: 'DOCKER BUILDS CONTAINER IMAGES OPTIMIZE HOW',
  },
]

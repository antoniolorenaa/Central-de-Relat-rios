export type Role = 'MASTER' | 'COORDINATION';

export interface Scope {
  brandId: string;
  unitId?: string;
  gradeLevelIds?: string[];
}

export interface UserProfile {
  id: string; // Firestore document ID
  firebaseUid?: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  scopes: Scope[];
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

export interface Brand {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Unit {
  id: string;
  brandId: string;
  code: string;
  name: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GradeLevel {
  id: string;
  code: string;
  name: string;
  order: number;
  active: boolean;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GradeLevelProgram {
  id: string;
  gradeLevelId: string;
  programId: string;
  active: boolean;
}

export interface Student {
  id: string;
  name: string;
  nameNormalized: string;
  educationalEmail: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Class {
  id: string;
  brandId: string;
  unitId: string;
  schoolYear: string;
  gradeLevelId: string;
  programId: string;
  displayName: string;
  shift: 'MORNING' | 'AFTERNOON' | 'FULL_TIME';
  active: boolean;
  createdAt: number;
  updatedAt: number;
  // Enriched fields from backend
  studentCount?: number;
  brandName?: string;
  unitName?: string;
  gradeLevelName?: string;
  programName?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  sourceSystem: string;
  externalStudentId: string;
  schoolYear: string;
  brandId: string;
  unitId: string;
  gradeLevelId: string;
  programId: string;
  classId: string;
  shift: 'MORNING' | 'AFTERNOON' | 'FULL_TIME';
  enrollmentStatus: 'ACTIVE' | 'INACTIVE';
  active: boolean;
  lastSeenImportBatchId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ImportBatch {
  id: string;
  filename: string;
  fileHash: string;
  sourceSystem: string;
  brandId: string;
  schoolYear: string;
  uploadedBy: string;
  uploadedAt: number;
  confirmedAt?: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newStudents: number;
  newEnrollments: number;
  updatedEnrollments: number;
  unchangedRows: number;
  conflicts: number;
  status: 'UPLOADED' | 'VALIDATED' | 'READY_TO_IMPORT' | 'IMPORTING' | 'PARTIALLY_IMPORTED' | 'IMPORTED' | 'FAILED';
  alreadyImportedWarning?: boolean;
}

export interface ImportRow {
  id: string;
  batchId: string;
  rowNumber: number;
  status: 'NEW_STUDENT' | 'NEW_ENROLLMENT' | 'UPDATE' | 'UNCHANGED' | 'CONFLICT' | 'INVALID';
  message?: string;
  
  // Raw Data
  rawName: string;
  rawExternalId: string;
  rawEmail: string;
  rawBrand: string;
  rawUnit: string;
  rawGradeLevel: string;
  rawProgram: string;
  rawShift: string;
  rawClassName: string;
  rawStatus: string;

  // Normalized References
  studentId?: string;
  brandId?: string;
  unitId?: string;
  gradeLevelId?: string;
  programId?: string;
  classId?: string;
  shift?: 'MORNING' | 'AFTERNOON' | 'FULL_TIME';
  enrollmentStatus?: 'ACTIVE' | 'INACTIVE';
}

export interface MatrixCriterion {
  id: string; // usually auto-generated
  code: string;
  objective: string;
  category: string;
  order: number;
  required: boolean;
  active: boolean;
}

export interface Matrix {
  id: string;
  brandId: string | 'GLOBAL';
  gradeLevelId: string;
  programId: string | 'ALL';
  schoolYear: string;
  period: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categories: string[];
  criteria: MatrixCriterion[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  publishedAt?: number;
}

export interface Assessment {
  id: string; // typically \`ass_\${enrollmentId}_\${period}\`
  studentId: string;
  enrollmentId: string;
  classId: string;
  matrixId: string;
  matrixVersion: number;
  schoolYear: string;
  period: string;
  answers: Record<string, 'D' | 'ED'>; // criterionId -> answer
  answeredCount: number;
  requiredCount: number;
  developedCount: number;
  inDevelopmentCount: number;
  completionPercentage: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  revision: number;
  updatedBy: string;
  updatedAt: number;
  createdAt: number;
}

export interface Report {
  id: string; // typically rep_${enrollmentId}_${period}
  studentId: string;
  enrollmentId: string;
  classId: string;
  assessmentId: string;
  matrixId: string;
  matrixVersion: number;
  schoolYear: string;
  period: string;
  
  strengths: string;
  developmentAspects: string;
  additionalInformation: string;
  finalText: string;
  
  reportStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'VALIDATED';
  
  revision: number;
  
  createdBy: string;
  updatedBy: string;
  validatedBy?: string;
  validatedAt?: number;
  validatedAssessmentRevision?: number;
  validatedMatrixId?: string;
  validatedMatrixVersion?: number;
  
  createdAt: number;
  updatedAt: number;
}

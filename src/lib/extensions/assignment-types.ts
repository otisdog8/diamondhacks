// ============================================================
// Assignment + Milestone types
// Add these to src/lib/extensions/types.ts
// ============================================================

export interface IMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;        // ISO date string — spread before assignment due date
  completed: boolean;
  order: number;          // 1, 2, 3... for display ordering
}

export interface IAssignment {
  id: string;
  userId: string;
  classId: string;
  title: string;
  description?: string;
  dueDate: string;        // ISO date string
  points?: number;
  type: "homework" | "project" | "exam" | "quiz" | "lab" | "other";
  source: "canvas" | "manual";
  canvasAssignmentId?: string;
  milestones: IMilestone[];
  completed: boolean;
  calendarExported: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAssignmentProvider {
  getAssignmentsForClass(userId: string, classId: string): Promise<IAssignment[]>;
  getAllAssignments(userId: string): Promise<IAssignment[]>;
  createAssignment(data: Omit<IAssignment, "id" | "createdAt" | "updatedAt" | "milestones" | "calendarExported">): Promise<IAssignment>;
  updateAssignment(id: string, updates: Partial<IAssignment>): Promise<IAssignment | null>;
  deleteAssignment(id: string): Promise<boolean>;
  updateMilestone(assignmentId: string, milestoneId: string, updates: Partial<IMilestone>): Promise<IAssignment | null>;
  generateMilestones(assignmentId: string): Promise<IAssignment>;
  syncFromCanvas(userId: string, classId: string, canvasUrl: string): Promise<IAssignment[]>;
  exportToCalendar(assignmentId: string, userId: string): Promise<boolean>;
}

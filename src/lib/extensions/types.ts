// ============================================================
// CanvasCal Extension Interfaces
// All 5 extension providers — drop into src/lib/extensions/types.ts
// ============================================================

// ---- Shared ----

export interface ITodo {
  id: string;
  userId: string;
  classId: string;
  title: string;
  description?: string;
  dueDate?: string;       // ISO date string
  completed: boolean;
  source: "canvas" | "manual";
  canvasAssignmentId?: string;
  createdAt: string;
}

export interface ITodoProvider {
  getTodosForClass(userId: string, classId: string): Promise<ITodo[]>;
  getAllTodos(userId: string): Promise<ITodo[]>;
  createTodo(todo: Omit<ITodo, "id" | "createdAt">): Promise<ITodo>;
  updateTodo(id: string, updates: Partial<ITodo>): Promise<ITodo | null>;
  deleteTodo(id: string): Promise<boolean>;
  syncFromCanvas(userId: string, classId: string, canvasUrl: string): Promise<ITodo[]>;
}

// ---- Travel Time ----

export interface ITravelSegment {
  id: string;
  userId: string;
  fromClassId: string;
  toClassId: string;
  fromLocation: string;
  toLocation: string;
  walkingMinutes: number;
  transitMinutes?: number;
  bufferWarning: boolean;   // true if gap between classes < walkingMinutes + 5min
  gapMinutes: number;       // actual minutes between end of first and start of second
  updatedAt: string;
}

export interface ITravelTimeProvider {
  getSegmentsForUser(userId: string): Promise<ITravelSegment[]>;
  computeSegments(userId: string): Promise<ITravelSegment[]>;
  refreshSegment(segmentId: string): Promise<ITravelSegment | null>;
}

// ---- Reminders ----

export type ReminderChannel = "email" | "sms";
export type ReminderStatus = "pending" | "sent" | "failed" | "cancelled";

export interface IReminder {
  id: string;
  userId: string;
  classId: string;
  channel: ReminderChannel;
  minutesBefore: number;
  destination: string;    // email address or phone number
  status: ReminderStatus;
  scheduledFor: string;   // ISO datetime of when to send
  sentAt?: string;
  createdAt: string;
}

export interface IReminderProvider {
  getRemindersForUser(userId: string): Promise<IReminder[]>;
  createReminder(reminder: Omit<IReminder, "id" | "createdAt" | "status">): Promise<IReminder>;
  updateReminder(id: string, updates: Partial<IReminder>): Promise<IReminder | null>;
  deleteReminder(id: string): Promise<boolean>;
  sendReminder(reminderId: string): Promise<boolean>;
  scheduleRemindersForClass(userId: string, classId: string): Promise<IReminder[]>;
}

// ---- Study Materials ----

export interface IFlashcard {
  front: string;
  back: string;
}

export interface IStudyMaterial {
  id: string;
  userId: string;
  classId: string;
  type: "flashcards" | "summary" | "textbook";
  title: string;
  content: string;          // markdown for summaries, JSON string for flashcards
  flashcards?: IFlashcard[];
  sourceUrl?: string;
  generatedAt: string;
}

export interface IStudyMaterialProvider {
  getMaterialsForClass(userId: string, classId: string): Promise<IStudyMaterial[]>;
  generateFlashcards(userId: string, classId: string): Promise<IStudyMaterial>;
  generateSummary(userId: string, classId: string): Promise<IStudyMaterial>;
  deleteMaterial(id: string): Promise<boolean>;
}

// ---- Lecture Provider ----

export interface ILectureSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
  topic?: string;
}

export interface ILecture {
  id: string;
  userId: string;
  classId: string;
  title: string;
  videoUrl: string;
  duration?: number;        // seconds
  transcript?: string;
  summary?: string;
  flashcards?: IFlashcard[];
  segments?: ILectureSegment[];
  status: "processing" | "ready" | "failed";
  createdAt: string;
  processedAt?: string;
}

export interface ILectureProvider {
  getLecturesForClass(userId: string, classId: string): Promise<ILecture[]>;
  addLecture(userId: string, classId: string, videoUrl: string, title: string): Promise<ILecture>;
  processLecture(lectureId: string): Promise<ILecture>;
  deleteLecture(id: string): Promise<boolean>;
}

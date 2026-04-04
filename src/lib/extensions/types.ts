// Extensibility interfaces - designed but not implemented
// Each interface represents a future feature area

import type { IClassInfo, ClassSchedule } from "@/lib/db/types";

// Todo list tracking per class
export interface Todo {
  id: string;
  classId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority: "low" | "medium" | "high";
  source?: "canvas" | "manual";
  createdAt: Date;
}

export interface ITodoProvider {
  getTodosForClass(classId: string): Promise<Todo[]>;
  getAllTodos(userId: string): Promise<Todo[]>;
  createTodo(classId: string, todo: Omit<Todo, "id" | "createdAt">): Promise<Todo>;
  toggleTodo(todoId: string): Promise<Todo>;
  deleteTodo(todoId: string): Promise<void>;
}

// Travel time between class locations
export interface TravelEstimate {
  fromLocation: string;
  toLocation: string;
  mode: "walk" | "bike" | "drive" | "transit";
  durationMinutes: number;
  distanceMiles: number;
}

export interface ITravelTimeProvider {
  calculateTravelTime(
    from: string,
    to: string,
    mode: "walk" | "bike" | "drive" | "transit"
  ): Promise<TravelEstimate>;
  getOptimalRoute(schedule: ClassSchedule[]): Promise<TravelEstimate[]>;
}

// Reminders via email or phone
export interface Reminder {
  id: string;
  classId: string;
  userId: string;
  channel: "email" | "sms" | "push";
  minutesBefore: number;
  enabled: boolean;
}

export interface IReminderProvider {
  scheduleReminder(
    classId: string,
    userId: string,
    channel: "email" | "sms" | "push",
    minutesBefore: number
  ): Promise<Reminder>;
  cancelReminder(reminderId: string): Promise<void>;
  getRemindersForUser(userId: string): Promise<Reminder[]>;
}

// Textbook retrieval and flashcard generation
export interface Textbook {
  title: string;
  author: string;
  isbn?: string;
  url?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  source: string;
  classId: string;
}

export interface IStudyMaterialProvider {
  findTextbooks(classInfo: IClassInfo): Promise<Textbook[]>;
  generateFlashcardsFromText(text: string, classId: string): Promise<Flashcard[]>;
  generateFlashcardsFromUrl(url: string, classId: string): Promise<Flashcard[]>;
}

// Lecture watching with video AI (TwelveLabs)
export interface VideoIndex {
  id: string;
  videoUrl: string;
  duration: number;
  indexedAt: Date;
}

export interface LectureSummary {
  title: string;
  summary: string;
  keyTopics: string[];
  timestamps: { time: number; topic: string }[];
}

export interface ILectureProvider {
  indexVideo(videoUrl: string, classId: string): Promise<VideoIndex>;
  generateFlashcardsFromVideo(videoIndexId: string): Promise<Flashcard[]>;
  summarizeLecture(videoIndexId: string): Promise<LectureSummary>;
  searchVideo(videoIndexId: string, query: string): Promise<{ time: number; text: string }[]>;
}

import mongoose, { Schema, Document } from "mongoose";
import type { ClassSchedule } from "../../types";

export interface ClassInfoDoc extends Document {
  userId: string;
  canvasId: string;
  name: string;
  code: string;
  instructor: string;
  term: string;
  enabled: boolean;
  schedule: ClassSchedule[];
  rawData: Record<string, unknown>;
  externalLinks: string[];
  syllabusUrl?: string;
  description?: string;
  lastScrapedAt?: Date;
  scrapeDepth: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSchema = new Schema<ClassSchedule>(
  {
    dayOfWeek: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String },
    type: {
      type: String,
      enum: ["lecture", "discussion", "lab", "office_hours", "final", "midterm", "other"],
      default: "lecture",
    },
    recurrence: { type: String },
  },
  { _id: false }
);

const ClassInfoSchema = new Schema<ClassInfoDoc>(
  {
    userId: { type: String, required: true, index: true },
    canvasId: { type: String, required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    instructor: { type: String, default: "" },
    term: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
    schedule: { type: [ScheduleSchema], default: [] },
    rawData: { type: Schema.Types.Mixed, default: {} },
    externalLinks: { type: [String], default: [] },
    syllabusUrl: { type: String },
    description: { type: String },
    lastScrapedAt: { type: Date },
    scrapeDepth: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ClassInfoModel =
  mongoose.models.ClassInfo ||
  mongoose.model<ClassInfoDoc>("ClassInfo", ClassInfoSchema);

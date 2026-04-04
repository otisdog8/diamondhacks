import mongoose, { Schema, Document } from "mongoose";

export interface BrowserProfileDoc extends Document {
  userId: string;
  profileId: string;
  service: "canvas" | "google";
  label: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

const BrowserProfileSchema = new Schema<BrowserProfileDoc>(
  {
    userId: { type: String, required: true, index: true },
    profileId: { type: String, required: true },
    service: { type: String, enum: ["canvas", "google"], required: true },
    label: { type: String, required: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

export const BrowserProfileModel =
  mongoose.models.BrowserProfile ||
  mongoose.model<BrowserProfileDoc>("BrowserProfile", BrowserProfileSchema);

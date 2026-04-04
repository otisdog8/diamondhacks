import mongoose, { Schema, Document } from "mongoose";

export interface UserDoc extends Document {
  username: string;
  passwordHash: string;
  canvasProfileId?: string;
  googleProfileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    canvasProfileId: { type: String },
    googleProfileId: { type: String },
  },
  { timestamps: true }
);

export const UserModel =
  mongoose.models.User || mongoose.model<UserDoc>("User", UserSchema);

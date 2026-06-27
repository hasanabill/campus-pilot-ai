import { model, models, Schema } from "mongoose";

const sectionSchema = new Schema(
  {
    batch_id: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    name: { type: String, required: true, trim: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

sectionSchema.index({ batch_id: 1, name: 1 }, { unique: true });
sectionSchema.index({ is_active: 1 });

const Section = models.Section ?? model("Section", sectionSchema);

export default Section;

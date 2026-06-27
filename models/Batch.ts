import { model, models, Schema } from "mongoose";

const batchSchema = new Schema(
  {
    department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    name: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

batchSchema.index({ department_id: 1, semester: 1, name: 1 }, { unique: true });
batchSchema.index({ is_active: 1 });

const Batch = models.Batch ?? model("Batch", batchSchema);

export default Batch;

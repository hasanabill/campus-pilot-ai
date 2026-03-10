import { model, models, Schema } from "mongoose";

const labResourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    resource_type: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    lab_room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

labResourceSchema.index({ lab_room_id: 1 });

const LabResource = models.LabResource ?? model("LabResource", labResourceSchema);

export default LabResource;

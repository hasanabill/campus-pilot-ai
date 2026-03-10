import { model, models, Schema } from "mongoose";

const reportSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    report_type: {
      type: String,
      enum: ["accreditation", "audit", "university_submission", "department_performance"],
      required: true,
    },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    generated_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    summary_text: { type: String, required: true },
    cloudinary_url: { type: String, default: null },
    public_id: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

reportSchema.index({ report_type: 1, period_start: 1, period_end: 1 });

const Report = models.Report ?? model("Report", reportSchema);

export default Report;

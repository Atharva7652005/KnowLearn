const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatarInitials: { type: String, default: "GU" },
    avatarBase64: { type: String },
    isPro: { type: Boolean, default: false },
    activePlan: { type: String, default: "Free", enum: ["Free", "Basic", "Pro", "Premium"] },
    purchasedPlans: { type: [String], default: ["Free"] },
    sarvamUsage: {
      date: { type: String, default: "" },
      convertedVideos: { type: [String], default: [] }
    },
    uploadsToday: {
      count: { type: Number, default: 0 },
      date: { type: String, default: "" }
    },
    regenerationsToday: {
      count: { type: Number, default: 0 },
      date: { type: String, default: "" }
    },
    docUploadsToday: {
      count: { type: Number, default: 0 },
      date: { type: String, default: "" }
    },
    rewardsPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

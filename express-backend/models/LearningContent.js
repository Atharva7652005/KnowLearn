const mongoose = require("mongoose");

const learningContentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fastApiContentId: { type: String, required: true },
    sourceType: { type: String, enum: ["youtube_url", "media_upload", "document"], required: true },
    sourceUrl: String,
    title: { type: String, required: true, trim: true, maxlength: 160 },
    language: { type: String, default: "en-US" },
    transcript: { type: String, required: true },
    englishTranslation: String,
    translations: { type: Map, of: String },
    generations: { type: Map, of: Number, default: () => new Map() },
    summary: String,
    notes: String,
    flashcards: [mongoose.Schema.Types.Mixed],
    quiz: { quizId: String, questions: [mongoose.Schema.Types.Mixed] },
    latestAnalysis: mongoose.Schema.Types.Mixed,
    chatHistory: [mongoose.Schema.Types.Mixed],
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearningContent", learningContentSchema);

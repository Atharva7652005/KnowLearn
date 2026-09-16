const router = require("express").Router();
const multer = require("multer");
const controller = require("../controllers/learning.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const os = require("os");

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/")) return callback(null, true);
    return callback(new Error("Upload an audio or video file."));
  },
});

const docUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith(".pptx") || ext.endsWith(".docx")) return callback(null, true);
    return callback(new Error("Only .pptx and .docx files are supported."));
  },
});

// Public SSE endpoint for progress tracking (auth happens via unique jobId)
router.get("/progress/:jobId", controller.uploadProgress);

router.use(requireAuth);
router.post("/transcript", upload.single("file"), controller.createTranscript);
router.get("/content", controller.listContent);
router.get("/content/:contentId", controller.getContent);
router.post("/content/:contentId/summary", controller.summary);
router.post("/chat/general", controller.generalChat);
router.post("/content/:contentId/chat", controller.chat);
router.post("/content/:contentId/chat/feedback", controller.chatFeedback);
router.post("/content/:contentId/quiz", controller.quiz);
router.post("/content/:contentId/notes", controller.notes);
router.post("/content/:contentId/flashcards", controller.flashcards);
router.post("/content/:contentId/evaluate", controller.evaluate);
router.delete("/content/:contentId", controller.deleteContent);
router.get("/analytics", controller.getAnalytics);

router.post("/content/:contentId/translate", controller.translateContent);
router.post("/translate/document", docUpload.single("file"), controller.translateDocument);

router.post("/tts", controller.tts);

module.exports = router;

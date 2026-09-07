const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const LearningContent = require("../models/LearningContent");
const ChatFeedback = require("../models/ChatFeedback");
const User = require("../models/User");
const { getCache, setCache, delCache } = require("../utils/redis");
const { FASTAPI_URL } = require("../const");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function userSafeAiMessage(message, status) {
  const detail = String(message || "");
  if (status === 429 || /resource_exhausted|quota|rate.?limit/i.test(detail)) {
    return "The AI learning service is temporarily busy. Please wait a minute and try again.";
  }
  if (/gemini|model|generate learning material/i.test(detail)) {
    return "The AI learning service is temporarily unavailable. Please try again shortly.";
  }
  return "The learning request could not be completed. Please try again.";
}

const PLAN_CONFIG = {
  Free: { generations: 1, model: "openai/gpt-4o-mini", count: 1 },
  Basic: { generations: 5, model: "openai/gpt-4o-mini", count: 5 },
  Pro: { generations: 10, model: "openai/gpt-4o", count: 10 },
  Premium: { generations: 25, model: "gpt-5.6-luna", count: 25 }
};

async function enforceGenerationLimitAndGetConfig(userId, content, feature) {
  const user = await User.findById(userId);
  const activePlan = user?.activePlan || "Free";
  const config = PLAN_CONFIG[activePlan];
  const today = new Date().toISOString().split('T')[0];

  if (user.regenerationsToday?.date !== today) {
    user.regenerationsToday = { count: 0, date: today };
  }

  if (user.regenerationsToday.count >= config.generations) {
    throw new Error(`You have reached your daily regeneration limit (${config.generations}) on the ${activePlan} plan.`);
  }

  user.regenerationsToday.count += 1;
  user.markModified('regenerationsToday');
  await user.save();
  
  if (!content.generations) content.generations = new Map();
  const used = content.generations.get(feature) || 0;
  content.generations.set(feature, used + 1);
  
  return config;
}

async function fastApi(path, options) {
  try {
    const response = await axios({
      url: `${FASTAPI_URL}${path}`,
      method: options.method || "GET",
      headers: options.headers || {},
      data: options.body
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      const providerMessage = error.response.data?.detail || error.response.data?.message;
      const err = new Error(userSafeAiMessage(providerMessage, error.response.status));
      err.status = error.response.status;
      throw err;
    }
    throw new Error("Invalid response from the AI service.");
  }
}

async function createTranscript(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const activePlan = user.activePlan || "Free";
    const limits = { "Free": 1, "Basic": 10, "Pro": 25, "Premium": 50 };
    const maxUploads = limits[activePlan] || 1;
    const today = new Date().toISOString().split('T')[0];

    if (user.uploadsToday?.date !== today) {
      user.uploadsToday = { count: 0, date: today };
    }

    if (user.uploadsToday.count >= maxUploads) {
      return res.status(403).json({ message: `You have reached your daily upload limit (${maxUploads}) for the ${activePlan} Plan.` });
    }

    user.uploadsToday.count += 1;
    user.markModified('uploadsToday');
    await user.save();

    let result;
    let title;
    let language;
    let uploadedSourceUrl = req.body.youtubeUrl;

    if (req.file) {
      language = req.body.language || "en-US";
      title = req.body.title?.trim() || req.file.originalname.replace(/\.[^.]+$/, "");
      const form = new FormData();
      form.append("file", fs.createReadStream(req.file.path), req.file.originalname);
      form.append("translate_to_english", String(req.body.translate === "on"));
      
      const fastApiPromise = fastApi("/transcript", { 
        method: "POST", 
        headers: form.getHeaders(),
        body: form 
      });

      const cloudinaryPromise = cloudinary.uploader.upload(req.file.path, { resource_type: "auto" });

      const [fastApiResult, cloudinaryResult] = await Promise.all([fastApiPromise, cloudinaryPromise]);
      result = fastApiResult;
      uploadedSourceUrl = cloudinaryResult.secure_url;

      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
    } else {
      const { youtubeUrl, language: inputLanguage = "en", translateToEnglish = false, title: requestedTitle } = req.body;
      if (!youtubeUrl) return res.status(400).json({ message: "Upload a file or provide a YouTube URL." });
      title = requestedTitle?.trim() || "YouTube lesson";
      language = inputLanguage;
      result = await fastApi("/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl, language, translate_to_english: translateToEnglish }),
      });
    }
    const content = await LearningContent.create({
      user: req.userId,
      fastApiContentId: result.content_id,
      sourceType: result.source_type,
      sourceUrl: uploadedSourceUrl,
      title,
      language: result.language || language,
      transcript: result.original_transcript,
      englishTranslation: result.english_translation,
    });
    await delCache(`user:content:list:${req.userId}`);
    return res.status(201).json({ content: toClientContent(content) });
  } catch (error) { return next(error); }
}

function toClientContent(content) {
  return {
    id: content.id, title: content.title, sourceType: content.sourceType, sourceUrl: content.sourceUrl, language: content.language,
    transcript: content.transcript, englishTranslation: content.englishTranslation, summary: content.summary,
    translations: content.translations ? Object.fromEntries(content.translations) : {},
    notes: content.notes, flashcards: content.flashcards,
    quiz: content.quiz, latestAnalysis: content.latestAnalysis, createdAt: content.createdAt,
    chatHistory: content.chatHistory,
  };
}

async function listContent(req, res, next) {
  try {
    const cacheKey = `user:content:list:${req.userId}`;
    const cachedList = await getCache(cacheKey);
    if (cachedList) return res.json({ content: cachedList });

    const content = await LearningContent.find({ user: req.userId }).sort({ updatedAt: -1 }).limit(50);
    const result = content.map(toClientContent);
    await setCache(cacheKey, result, 1800); // 30 minutes
    return res.json({ content: result });
  } catch (error) { return next(error); }
}

async function getContent(req, res, next) {
  try {
    const cacheKey = `content:detail:${req.params.contentId}`;
    const cachedContent = await getCache(cacheKey);
    if (cachedContent) return res.json({ content: cachedContent });

    const content = await LearningContent.findOne({ _id: req.params.contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: "Learning material not found." });
    const result = toClientContent(content);
    await setCache(cacheKey, result, 86400); // 24 hours
    return res.json({ content: result });
  } catch (error) { return next(error); }
}

async function summary(req, res, next) {
  try {
    const content = await LearningContent.findOne({ _id: req.params.contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: "Learning material not found." });
    const config = await enforceGenerationLimitAndGetConfig(req.userId, content, 'summary');
    const result = await fastApi("/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content_id: content.fastApiContentId, model: config.model }) });
    content.summary = result.summary;
    await content.save();
      await delCache(`content:detail:${req.params.contentId}`);
    return res.json({ summary: result.summary });
  } catch (error) { return next(error); }
}

async function chat(req, res, next) {
  try {
    const content = await LearningContent.findOne({ _id: req.params.contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: "Learning material not found." });
    
    // Fetch previous negative feedback to improve prompts
    const negativeFeedback = await ChatFeedback.find({ user: req.userId, contentId: content._id, rating: -1 }).sort({ createdAt: -1 }).limit(5);
    const previous_feedback = negativeFeedback.map(f => `Question: ${f.question}\nYour Answer: ${f.answer}`);
    
    const user = await User.findById(req.userId);
    const activePlan = user?.activePlan || "Free";
    const model = PLAN_CONFIG[activePlan].model;
    
    const result = await fastApi("/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content_id: content.fastApiContentId, question: req.body.question, previous_feedback, model }) });
    
    if (!content.chatHistory) content.chatHistory = [];
    content.chatHistory.push({ role: "user", text: req.body.question });
    if (result.answer) {
      content.chatHistory.push({ role: "assistant", text: result.answer, source: result.retrieved_context?.[0] });
      await content.save();
      await delCache(`content:detail:${req.params.contentId}`);
    }
    
    return res.json(result);
  } catch (error) { return next(error); }
}

async function generalChat(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    const activePlan = user?.activePlan || "Free";
    const model = PLAN_CONFIG[activePlan].model;
    
    const result = await fastApi("/general_chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: req.body.question, model }) });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function quiz(req, res, next) {
  try {
    const content = await LearningContent.findOne({ _id: req.params.contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: "Learning material not found." });
    
    const config = await enforceGenerationLimitAndGetConfig(req.userId, content, 'quiz');
    
    // Default to 5, allow frontend to request 10 or 15
    let requestedCount = req.body.count || 5;
    if (![5, 10, 15].includes(requestedCount)) requestedCount = 5;

    const result = await fastApi("/quiz", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ 
        content_id: content.fastApiContentId, 
        count: requestedCount, 
        model: config.model 
      }) 
    });
    content.quiz = { quizId: result.quiz_id, questions: result.questions };
    await content.save();
      await delCache(`content:detail:${req.params.contentId}`);
    return res.json(result);
  } catch (error) { return next(error); }
}

async function notes(req, res, next) {
  try {
    const content = await LearningContent.findOne({ _id: req.params.contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: "Learning material not found." });
    const config = await enforceGenerationLimitAndGetConfig(req.userId, content, 'notes');
    const result = await fastApi("/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content_id: content.fastApiContentId, model: config.model }) });
    content.notes = result.notes;
    await content.save();
      await delCache(`content:detail:${req.params.contentId}`);
    return res.json({ notes: result.notes });
  } catch (error) { return next(error); }
}

async function flashcards(req, res, next) {
  try {
    const content = await LearningContent.findOne({ _id: req.params.contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: "Learning material not found." });
    const config = await enforceGenerationLimitAndGetConfig(req.userId, content, 'flashcards');
    const result = await fastApi("/flashcards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content_id: content.fastApiContentId, count: config.count, model: config.model }) });
    content.flashcards = result.flashcards;
    await content.save();
      await delCache(`content:detail:${req.params.contentId}`);
    return res.json({ flashcards: result.flashcards });
  } catch (error) { return next(error); }
}

async function evaluate(req, res, next) {
  try {
    const content = await LearningContent.findOne({ _id: req.params.contentId, user: req.userId });
    if (!content?.quiz?.quizId) return res.status(400).json({ message: "Generate a quiz before submitting answers." });
    const result = await fastApi("/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quiz_id: content.quiz.quizId, answers: req.body.answers }) });
    content.latestAnalysis = result;
    await content.save();
      await delCache(`content:detail:${req.params.contentId}`);
    
    // Award points
    await User.findByIdAndUpdate(req.userId, { $inc: { rewardsPoints: 50 } });
    
    return res.json(result);
  } catch (error) { return next(error); }
}

async function deleteContent(req, res, next) {
  try {
    const { contentId } = req.params;
    const content = await LearningContent.findOneAndDelete({ _id: contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: "Content not found." });
    await delCache(`user:content:list:${req.userId}`);
    await delCache(`content:detail:${contentId}`);
    return res.json({ message: "Content deleted successfully." });
  } catch (error) { return next(error); }
}

async function chatFeedback(req, res, next) {
  try {
    const { question, answer, rating } = req.body;
    await ChatFeedback.create({ user: req.userId, contentId: req.params.contentId, question, answer, rating });
    return res.json({ message: "Feedback recorded." });
  } catch (error) { return next(error); }
}



async function translateContent(req, res, next) {
  try {
    const { contentId } = req.params;
    const { targetLanguage } = req.body;
    
    if (!targetLanguage) return res.status(400).json({ message: 'targetLanguage is required.' });

    const content = await LearningContent.findOne({ _id: contentId, user: req.userId });
    if (!content) return res.status(404).json({ message: 'Content not found.' });

    if (targetLanguage === 'English' && content.englishTranslation) {
      return res.json({ translation: content.englishTranslation });
    }

    if (content.translations && content.translations.get(targetLanguage)) {
      return res.json({ translation: content.translations.get(targetLanguage) });
    }

    const user = await User.findById(req.userId);
    const activePlan = user?.activePlan || "Free";
    const model = PLAN_CONFIG[activePlan].model;

    const result = await fastApi('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: content.englishTranslation || content.transcript, target_language: targetLanguage, model })
    });

    if (!content.translations) content.translations = new Map();
    content.translations.set(targetLanguage, result.translation);
    await content.save();
      await delCache(`content:detail:${req.params.contentId}`);

    return res.json({ translation: result.translation });
  } catch (error) {
    return next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const contents = await LearningContent.find({ user: req.userId });
    const feedback = await ChatFeedback.find({ user: req.userId });
    
    let totalSummaries = 0;
    let totalQuizzes = 0;
    let totalFlashcards = 0;
    let totalNotes = 0;
    let totalGenerations = 0;
    
    const languageDistribution = {};
    const translationFrequency = {};
    const performanceTrends = [];
    
    contents.forEach(content => {
      if (content.summary) totalSummaries++;
      if (content.quiz && content.quiz.questions) totalQuizzes++;
      if (content.flashcards && content.flashcards.length) totalFlashcards++;
      if (content.notes) totalNotes++;
      
      if (content.generations) {
        content.generations.forEach(val => totalGenerations += val);
      }
      
      const lang = content.language || "Unknown";
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
      
      if (content.translations) {
        content.translations.forEach((val, key) => {
          translationFrequency[key] = (translationFrequency[key] || 0) + 1;
        });
      }
      
      if (content.latestAnalysis && content.latestAnalysis.accuracy_percent !== undefined) {
        performanceTrends.push({
          date: content.createdAt,
          title: content.title,
          accuracy: content.latestAnalysis.accuracy_percent
        });
      }
    });
    
    performanceTrends.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let thumbsUp = 0;
    let thumbsDown = 0;
    feedback.forEach(f => {
      if (f.rating === 1) thumbsUp++;
      if (f.rating === -1) thumbsDown++;
    });
    
    return res.json({
      totalUploads: contents.length,
      totalSummaries,
      totalQuizzes,
      totalFlashcards,
      totalNotes,
      totalGenerations,
      languageDistribution,
      translationFrequency,
      performanceTrends,
      feedback: { thumbsUp, thumbsDown }
    });
  } catch (error) { return next(error); }
}

async function translateDocument(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.activePlan !== 'Premium') {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: "Document translation is exclusively for Premium users." });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const docUploads = user.docUploadsToday || { count: 0, date: "" };
    if (docUploads.date !== today) {
      docUploads.date = today;
      docUploads.count = 0;
    }
    if (docUploads.count >= 1) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: "Daily document translation limit reached (1/1)." });
    }
    
    if (!req.file) return res.status(400).json({ message: "No document provided." });
    const targetLanguage = req.body.target_language || "English";
    
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path));
    formData.append("target_language", targetLanguage);
    formData.append("model", "openai/gpt-5.6-luna");
    
    // Call FastAPI
    const response = await axios.post(`${FASTAPI_URL}/document/translate`, formData, {
      headers: formData.getHeaders(),
      responseType: 'stream',
      timeout: 120000 // 2 minutes for translation
    });
    
    const path = require("path");
    const fileName = `Translated_${Date.now()}_${req.file.originalname}`;
    const publicDir = path.join(__dirname, "..", "public", "documents");
    const filePath = path.join(publicDir, fileName);
    
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    fs.unlink(req.file.path, () => {});
    
    docUploads.count += 1;
    user.docUploadsToday = docUploads;
    user.markModified('docUploadsToday');
    await user.save();
    
    // In dev, assuming localhost:3000 is our express server
    // For production, use process.env.API_URL
    const serverUrl = process.env.API_URL || "http://localhost:3000";
    const documentUrl = `${serverUrl}/public/documents/${fileName}`;
    
    // Auto-delete after 5 minutes
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to auto-delete translated document:", err);
      });
    }, 5 * 60 * 1000);
    
    return res.json({
      message: "Document translated successfully",
      documentUrl,
      fileName
    });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (error.response && error.response.status === 415) {
      return res.status(415).json({ message: "Unsupported file format." });
    }
    console.error("Document translation error:", error);
    return res.status(502).json({ message: "The AI learning service is temporarily busy. Please wait a minute and try again." });
  }
}

module.exports = { createTranscript, listContent, getContent, summary, chat, generalChat, quiz, notes, flashcards, evaluate, deleteContent, chatFeedback, translateContent, getAnalytics, translateDocument };



const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_EXPIRES_IN } = require("../const");
const { ensureUploadsReset } = require("../utils/resetHelper");
const { getCache, setCache } = require("../utils/redis");

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, avatarInitials: user.avatarInitials, avatarBase64: user.avatarBase64, isPro: user.isPro, activePlan: user.activePlan, purchasedPlans: user.purchasedPlans, uploadsToday: user.uploadsToday, docUploadsToday: user.docUploadsToday, rewardsPoints: user.rewardsPoints };
}

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ message: "Name, email, and an 8-character password are required." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const avatarInitials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), avatarInitials });
    const resetUser = await ensureUploadsReset(user);
    return res.status(201).json({ token: signToken(resetUser), user: publicUser(resetUser) });
  } catch (error) { return next(error); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ message: "Invalid email or password." });
    const resetUser = await ensureUploadsReset(user);
    return res.json({ token: signToken(resetUser), user: publicUser(resetUser) });
  } catch (error) { return next(error); }
}

async function me(req, res, next) {
  try {
    const cacheKey = `user:profile:${req.userId}`;
    const cachedProfile = await getCache(cacheKey);
    if (cachedProfile) return res.json({ user: cachedProfile });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    const resetUser = await ensureUploadsReset(user);
    const profile = publicUser(resetUser);
    
    await setCache(cacheKey, profile, 3600);
    return res.json({ user: profile });
  } catch (error) { return next(error); }
}

module.exports = { register, login, me };

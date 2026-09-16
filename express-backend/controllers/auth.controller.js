const nodemailer = require("nodemailer");
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

async function sendOtp(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ message: "Name, email, and an 8-character password are required." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to Redis (60 seconds TTL)
    const cacheKey = `otp:${normalizedEmail}`;
    await setCache(cacheKey, otp, 60);

    // Send email via Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      }
    });

    const mailOptions = {
      from: `"KnowLearn" <${process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: "Verify Your Email - KnowLearn",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Verify Your Email</h1>
          </div>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi <strong>${name}</strong>,<br><br>
            You are almost ready to start using KnowLearn. Please enter the verification code below on the sign-up page to complete your registration.
          </p>
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <span style="font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #ef4444; font-size: 14px; text-align: center; font-weight: 600; margin-bottom: 25px;">
            ⏳ This code is valid for exactly 60 seconds.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 13px; text-align: center; line-height: 1.5;">
            If you did not request this email, please ignore it.<br>
            Need help? Contact us at <a href="mailto:support@knowlearn.teams" style="color: #2563eb; text-decoration: none;">support@knowlearn.teams</a>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("OTP Error:", error);
    return res.status(500).json({ message: "Failed to send OTP email" });
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ message: "Name, email, and an 8-character password are required." });
    }
    if (!otp) {
      return res.status(400).json({ message: "OTP is required for registration." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify OTP
    const cacheKey = `otp:${normalizedEmail}`;
    const cachedOtp = await getCache(cacheKey);
    
    if (!cachedOtp) {
      return res.status(400).json({ message: "OTP expired. Please resend." });
    }
    if (cachedOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    
    const { delCache } = require("../utils/redis");
    await delCache(cacheKey);

    const avatarInitials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), avatarInitials });
    const resetUser = await ensureUploadsReset(user);
    
    // Dispatch Welcome Email asynchronously
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        }
      });
      
      const welcomeOptions = {
        from: `"KnowLearn" <${process.env.EMAIL_USER}>`,
        to: normalizedEmail,
        subject: "Welcome to KnowLearn!",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; padding: 35px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h1 style="color: #0f172a; font-size: 26px; text-align: center; margin-bottom: 20px;">Welcome to KnowLearn!</h1>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Hi <strong>${name}</strong>,<br><br>
              Your account has been successfully created. We are happy to have you on board! KnowLearn is designed to turn your lectures and videos into actionable, deeply understandable learning material.
            </p>
            
            <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px;">
              <h3 style="color: #0f172a; margin-top: 0; font-size: 16px;">Here's what you can do right now:</h3>
              <ul style="color: #475569; font-size: 15px; line-height: 1.7; padding-left: 20px; margin-bottom: 0;">
                <li><strong>Transcripts & Translations:</strong> Upload a video or link a YouTube URL to generate instant, accurate transcripts and translations.</li>
                <li><strong>RAG Tutor:</strong> Chat directly with your lecture material to answer specific questions.</li>
                <li><strong>Read Aloud:</strong> Use our native Text-to-Speech engines to listen to your notes on the go.</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="http://localhost:5173/app" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              We're here to help you learn faster and better. If you have any questions, just reply to this email!
            </p>
          </div>
        `
      };
      
      // Send without awaiting to avoid blocking the user login
      transporter.sendMail(welcomeOptions).catch(err => console.error("Welcome Email Error:", err));
    } catch (emailErr) {
      console.error("Welcome Email setup error:", emailErr);
    }
    
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

module.exports = { sendOtp, register, login, me };

const Workspace = require("../models/Workspace");
const LearningContent = require("../models/LearningContent");

// Helper to generate 4-char code
const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

exports.createWorkspace = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Workspace name is required." });

        let inviteCode;
        let isUnique = false;
        while (!isUnique) {
            inviteCode = generateInviteCode();
            const existing = await Workspace.findOne({ inviteCode });
            if (!existing) isUnique = true;
        }

        const workspace = new Workspace({
            name,
            ownerId: req.userId,
            inviteCode,
            members: [req.userId]
        });

        await workspace.save();
        res.status(201).json(workspace);
    } catch (err) {
        next(err);
    }
};

exports.joinWorkspace = async (req, res, next) => {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode) return res.status(400).json({ message: "Invite code is required." });

        const workspace = await Workspace.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!workspace) return res.status(404).json({ message: "Workspace not found." });

        if (workspace.members.includes(req.userId)) {
            return res.status(400).json({ message: "You are already a member." });
        }

        if (workspace.members.length >= 7) {
            return res.status(400).json({ message: "Workspace has reached the maximum limit of 7 members." });
        }

        workspace.members.push(req.userId);
        await workspace.save();

        res.status(200).json(workspace);
    } catch (err) {
        next(err);
    }
};

exports.getWorkspaces = async (req, res, next) => {
    try {
        const workspaces = await Workspace.find({ members: req.userId }).populate("ownerId", "name email");
        res.status(200).json(workspaces);
    } catch (err) {
        next(err);
    }
};

exports.getWorkspaceContent = async (req, res, next) => {
    try {
        const { workspaceId } = req.params;
        const workspace = await Workspace.findById(workspaceId).populate("ownerId", "name email");
        
        if (!workspace) return res.status(404).json({ message: "Workspace not found." });
        if (!workspace.members.includes(req.userId)) {
            return res.status(403).json({ message: "Access denied." });
        }

        const content = await LearningContent.find({ workspaceId }).sort({ createdAt: -1 });
        res.status(200).json({ workspace, content });
    } catch (err) {
        next(err);
    }
};

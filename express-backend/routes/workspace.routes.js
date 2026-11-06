const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { createWorkspace, joinWorkspace, getWorkspaces, getWorkspaceContent } = require("../controllers/workspace.controller");

router.use(requireAuth);

router.post("/create", createWorkspace);
router.post("/join", joinWorkspace);
router.get("/list", getWorkspaces);
router.get("/:workspaceId/content", getWorkspaceContent);

module.exports = router;

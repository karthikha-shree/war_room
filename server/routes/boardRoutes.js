const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
    createBoard,
    getMyBoards,
    getBoardById,
    moveTask,
    addTaskToColumn,
    createColumn,
    deleteColumn,
    addMemberToBoard,
    softDeleteBoard,
    permanentDeleteBoard,
    removeMemberFromBoard,
} = require("../controllers/boardController");

// Create board
router.post("/", protect, createBoard);

// Get all boards user is part of
router.get("/", protect, getMyBoards);

// Get single board (permission check inside controller)
router.get("/:id", protect, getBoardById);

// Move task between columns
router.put("/:boardId/tasks/move", protect, moveTask);

// Add task to a column
router.post("/:boardId/columns/:columnId/tasks", protect, addTaskToColumn);

// Create a new column in a board
router.post("/:boardId/columns", protect, createColumn);

// Delete a column from a board
router.delete("/:boardId/columns/:columnId", protect, deleteColumn);

// Add member to board
router.post("/:boardId/members", protect, addMemberToBoard);

// Soft delete a board
router.put("/:boardId/soft-delete", protect, softDeleteBoard);

// Permanent delete a board
router.delete("/:boardId", protect, permanentDeleteBoard);

// Remove member from board
router.delete("/:boardId/members/:userId", protect, removeMemberFromBoard);

module.exports = router;

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
    restoreSoftDeletedBoard,
    permanentDeleteBoard,
    removeMemberFromBoard,
    changeMemberRole,
    editBoard,
    getBoardMembers,
    getBoardInvitations,
    leaveBoard,
    cancelInvitation,
    completeBoard,
    restoreBoard,
    editTask,
    deleteTask,
    reorderTasks,
    assignTask,
    renameColumn,
    reorderColumns,
    addComment,
    editComment,
    deleteComment,
    getBoardActivityLogs,
    getBoardChat,
} = require("../controllers/boardController");

// ===== GET ROUTES =====
// Get activity logs for a board
router.get("/:boardId/activity", protect, getBoardActivityLogs);

// Get chat messages for a board    
router.get("/:boardId/chat", protect, getBoardChat);

// Get board members
router.get("/:boardId/members", protect, getBoardMembers);

// Get board invitations  
router.get("/:boardId/invitations", protect, getBoardInvitations);

// Get all boards user is part of
router.get("/", protect, getMyBoards);

// Get single board (permission check inside controller)
router.get("/:id", protect, getBoardById);

// ===== POST ROUTES =====
// Create board
router.post("/", protect, createBoard);

// Add comment to a task
router.post("/:boardId/columns/:columnId/tasks/:taskId/comments", protect, addComment);

// Add task to a column
router.post("/:boardId/columns/:columnId/tasks", protect, addTaskToColumn);

// Create a new column in a board
router.post("/:boardId/columns", protect, createColumn);

// Add member to board
router.post("/:boardId/members", protect, addMemberToBoard);

// ===== PUT ROUTES (SPECIFIC FIRST, GENERIC LAST) =====
// Restore soft deleted board (most specific)
router.put("/:boardId/soft-delete/restore", protect, restoreSoftDeletedBoard);

// Soft delete a board
router.put("/:boardId/soft-delete", protect, softDeleteBoard);

// Leave board
router.put("/:boardId/leave", protect, leaveBoard);

// Mark board as completed
router.put("/:boardId/complete", protect, completeBoard);

// Restore board from completed to active
router.put("/:boardId/restore", protect, restoreBoard);

// Move task between columns
router.put("/:boardId/tasks/move", protect, moveTask);

// Reorder columns within a board
router.put("/:boardId/reorder-columns", protect, reorderColumns);

// Reorder tasks within a column
router.put("/:boardId/columns/:columnId/tasks/reorder", protect, reorderTasks);

// Assign a task to a user
router.put("/:boardId/columns/:columnId/tasks/:taskId/assign", protect, assignTask);

// Edit comment on a task
router.put("/:boardId/columns/:columnId/tasks/:taskId/comments/:commentId", protect, editComment);

// Edit a task within a column
router.put("/:boardId/columns/:columnId/tasks/:taskId", protect, editTask);

// Rename a column within a board
router.put("/:boardId/columns/:columnId", protect, renameColumn);

// Change member role in board
router.put("/:boardId/members/:userId/role", protect, changeMemberRole);

// Edit board details (GENERIC - MUST BE LAST PUT ROUTE)
router.put("/:boardId", protect, editBoard);

// ===== DELETE ROUTES (SPECIFIC FIRST, GENERIC LAST) =====
// Delete comment on a task
router.delete("/:boardId/columns/:columnId/tasks/:taskId/comments/:commentId", protect, deleteComment);

// Delete a task within a column
router.delete("/:boardId/columns/:columnId/tasks/:taskId", protect, deleteTask);

// Delete a column from a board
router.delete("/:boardId/columns/:columnId", protect, deleteColumn);

// Cancel invitation
router.delete("/:boardId/invitations", protect, cancelInvitation);

// Remove member from board
router.delete("/:boardId/members/:userId", protect, removeMemberFromBoard);

// Permanent delete a board (GENERIC - MUST BE LAST DELETE ROUTE)
router.delete("/:boardId", protect, permanentDeleteBoard);

module.exports = router;

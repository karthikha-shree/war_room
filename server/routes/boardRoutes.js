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
    changeMemberRole,
    editBoard,
    getBoardMembers,
    leaveBoard,
    completeBoard,
    editTask,
    deleteTask,
    reorderTasks,
    assignTask,
    renameColumn,
    reorderColumns,
    addComment,
    editComment,
    deleteComment,
    getBoardActivityLogs
} = require("../controllers/boardController");

// Get activity logs for a board
router.get("/:boardId/activity", protect, getBoardActivityLogs);

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

// Change member role in board
router.put(  "/:boardId/members/:userId/role",  protect,  changeMemberRole);

// Edit board details
router.put("/:boardId", protect, editBoard);

// Get board members
router.get("/:boardId/members", protect, getBoardMembers);

// Leave board not by owner but by member decision
router.put("/:boardId/leave", protect, leaveBoard);

// Mark board as completed
router.put("/:boardId/complete", protect, completeBoard);

// DELETE a task within a column
router.delete(  "/:boardId/columns/:columnId/tasks/:taskId",  protect,  deleteTask);
  
// Reorder tasks within a column
router.put(  "/:boardId/columns/:columnId/tasks/reorder",  protect,  reorderTasks);

// Edit a task within a column
router.put(  "/:boardId/columns/:columnId/tasks/:taskId",  protect,  editTask);

// Assign a task to a user
router.put(  "/:boardId/columns/:columnId/tasks/:taskId/assign",  protect,  assignTask);

// Reorder columns within a board
router.put(  "/:boardId/columns/reorder",  protect,  reorderColumns);

// Rename a column within a board
router.put(  "/:boardId/columns/:columnId",  protect,  renameColumn);

//add comment to a task
router.post("/:boardId/columns/:columnId/tasks/:taskId/comments", protect, addComment);

//edit comment on a task
router.put("/:boardId/columns/:columnId/tasks/:taskId/comments/:commentId", protect, editComment);

//delete comment on a task
router.delete("/:boardId/columns/:columnId/tasks/:taskId/comments/:commentId", protect, deleteComment);

module.exports = router;

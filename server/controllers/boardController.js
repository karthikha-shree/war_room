const User = require("../models/User");
const Board = require("../models/Board");
const { isBoardMember } = require("../utils/boardPermissions");

// CREATE BOARD
exports.createBoard = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Board title is required" });
    }

    // Default Kanban columns
    const defaultColumns = [
      { title: "To Do", order: 1, tasks: [] },
      { title: "In Progress", order: 2, tasks: [] },
      { title: "Done", order: 3, tasks: [] },
    ];

    const board = await Board.create({
      title,
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "admin",
        },
      ],
      columns: defaultColumns,
    });

    res.status(201).json(board);
  } catch (error) {
    console.error("CREATE BOARD ERROR:", error);
    res.status(500).json({ message: "Failed to create board" });
  }
};

// GET BOARDS CREATED BY USER
exports.getMyBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $and: [
        {
          $or: [
            { createdBy: req.user._id },
            { "members.user": req.user._id },
          ],
        },
        {
          deletedFor: { $ne: req.user._id },
        },
      ],
    });

    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch boards" });
  }
};

// Helper function to check if user is a member of the board
exports.getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("members.user", "name email");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔐 BOARD ACCESS CHECK
    if (!isBoardMember(board, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Add task to a column
// @route  POST /api/boards/:boardId/columns/:columnId/tasks
// @access Private
exports.addTaskToColumn = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔐 Permission check
    if (!isBoardMember(board, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 📍 Find column
    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // 🧩 Create task
    const newTask = {
      title,
      description: description || "",
      comments: [],
    };

    column.tasks.push(newTask);
    await board.save();

    res.status(201).json({
      message: "Task added successfully",
      task: column.tasks[column.tasks.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add task",
      error: error.message,
    });
  }
};
exports.createColumn = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Column title is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔐 Admin check
    const isAdmin =
      board.createdBy.toString() === req.user._id.toString() ||
      board.members.some(
        (m) =>
          m.user.toString() === req.user._id.toString() &&
          m.role === "admin"
      );

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can add columns" });
    }

    const newColumn = {
      title,
      order: board.columns.length,
      tasks: [],
    };

    board.columns.push(newColumn);

    // 🧠 Activity log
    board.$locals = {
      user: req.user._id,
      action: "Created column",
      meta: { title },
    };

    await board.save();

    res.status(201).json({
      message: "Column created",
      column: board.columns[board.columns.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create column",
      error: error.message,
    });
  }
};

exports.deleteColumn = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔐 Admin check
    const isAdmin =
      board.createdBy.toString() === req.user._id.toString() ||
      board.members.some(
        (m) =>
          m.user.toString() === req.user._id.toString() &&
          m.role === "admin"
      );

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can delete columns" });
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    column.remove();

    board.$locals = {
      user: req.user._id,
      action: "Deleted column",
      meta: { columnId },
    };

    await board.save();

    res.status(200).json({ message: "Column deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete column",
      error: error.message,
    });
  }
};

// MOVE TASK BETWEEN COLUMNS
exports.moveTask = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { sourceColumnId, destinationColumnId, taskId } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔐 Permission check
    if (!isBoardMember(board, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 📍 Find source & destination columns
    const sourceColumn = board.columns.id(sourceColumnId);
    const destinationColumn = board.columns.id(destinationColumnId);

    if (!sourceColumn || !destinationColumn) {
      return res.status(404).json({ message: "Column not found" });
    }

    // 📦 Find task
    const task = sourceColumn.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 🧠 REMOVE from source
    sourceColumn.tasks = sourceColumn.tasks.filter(
      (t) => t._id.toString() !== taskId
    );

    // 🧠 ADD to destination
    destinationColumn.tasks.push(task);

    await board.save();

    res.status(200).json({
      message: "Task moved successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to move task",
      error: error.message,
    });
  }
};

// ADD MEMBER (OWNER ONLY)
exports.addMemberToBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Only owner can add members
    if (board.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only owner can add members" });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Prevent duplicate member
    const alreadyMember =
      board.createdBy.toString() === userToAdd._id.toString() ||
      board.members.some(
        (m) => m.user.toString() === userToAdd._id.toString()
      );

    if (alreadyMember) {
      return res.status(400).json({ message: "User already in board" });
    }

    board.members.push({
      user: userToAdd._id,
      role: "member",
    });

    await board.save();

    res.status(200).json({
      message: "Member added successfully",
      member: {
        id: userToAdd._id,
        email: userToAdd.email,
        name: userToAdd.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add member",
      error: error.message,
    });
  }
};
// SOFT DELETE BOARD (DELETE FOR ME)
exports.softDeleteBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // If already soft deleted
    if (board.deletedFor.includes(userId)) {
      return res.status(400).json({ message: "Board already deleted for you" });
    }

    board.deletedFor.push(userId);
    await board.save();

    res.status(200).json({
      message: "Board removed from your view",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete board",
      error: error.message,
    });
  }
};

// PERMANENT DELETE BOARD (OWNER ONLY)
exports.permanentDeleteBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Only owner can permanently delete
    if (board.createdBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only owner can permanently delete the board" });
    }

    await board.deleteOne();

    res.status(200).json({
      message: "Board permanently deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to permanently delete board",
      error: error.message,
    });
  }
};

// REMOVE MEMBER FROM BOARD (OWNER ONLY)
exports.removeMemberFromBoard = async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const currentUserId = req.user._id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Only owner can remove members
    if (board.createdBy.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only owner can remove members" });
    }

    // 🔒 Owner cannot be removed
    if (board.createdBy.toString() === userId) {
      return res
        .status(400)
        .json({ message: "Owner cannot be removed from the board" });
    }

    const memberIndex = board.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in board" });
    }

    board.members.splice(memberIndex, 1);
    await board.save();

    res.status(200).json({
      message: "Member removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove member",
      error: error.message,
    });
  }
};

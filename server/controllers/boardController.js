const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const Board = require("../models/Board");
const ActivityLog = require("../models/ActivityLog");
const { isBoardMember } = require("../utils/boardPermissions");
const { getIO } = require("../socket");


// GET CHAT MESSAGES FOR A BOARD
exports.getBoardChat = async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔐 Permission check
    if (!isBoardMember(board, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await ChatMessage.find({ board: boardId })
      .populate("user", "name email")
      .sort({ createdAt: 1 }); // oldest → newest

    res.json(messages);
  } catch (error) {
    console.error("GET CHAT ERROR:", error);
    res.status(500).json({ message: "Failed to fetch chat" });
  }
};


// GET ACTIVITY LOGS FOR A BOARD
exports.getBoardActivityLogs = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Permission check (member or owner)
    const isMember =
      board.createdBy.toString() === userId.toString() ||
      board.members.some(
        (m) => m.user.toString() === userId.toString()
      );

    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    const logs = await ActivityLog.find({ board: boardId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (error) {
    console.error("GET ACTIVITY LOGS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
};


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
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_CREATED",
      meta: { boardTitle: board.title, createdAt: board.createdAt, },
    });
    // const io = getIO();
    // io.emit("board:created", board);

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

    // 🔒 BLOCK if board was soft-deleted for this user
    if (
      board.deletedFor &&
      board.deletedFor.some(
        (id) => id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Board removed for you" });
    }

    // 🔐 BOARD ACCESS CHECK
    if (!isBoardMember(board, req.user._id)) {
      return res.status(403).json({ message: "Access denied TO ACCESS BOARD" });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: "Server error", err: error.stack });
  }
};


// ADD TASK TO COLUMN
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

    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "TASK_CREATED",
      meta: {
        taskTitle: newTask.title,
        columnTitle: column.title,
      },
    });

    const io = getIO();
    const createdTask = column.tasks[column.tasks.length - 1];

    io.to(board._id.toString()).emit("task:created", {
      boardId: board._id,
      columnId: column._id,
      task: createdTask,
    });

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


// CREATE COLUMN IN BOARD
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
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COLUMN_CREATED",
      meta: {
        columnTitle: newColumn.title,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("column:created", {
      boardId: board._id,
      column: board.columns[board.columns.length - 1],
    });

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


// DELETE COLUMN FROM BOARD
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
      meta: { columnId, columnTitle: column.title },
    };

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COLUMN_DELETED",
      meta: {
        columnId,
        columnTitle: column.title,
      },
    });

    const io = getIO();
    io.to(board._id.toString()).emit("column:deleted", {
      boardId: board._id,
      columnId,
    });

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

    // 📍 BEFORE move (save titles)
    const fromColumnTitle = sourceColumn.title;
    const toColumnTitle = destinationColumn.title;
    // 🧠 REMOVE from source
    sourceColumn.tasks = sourceColumn.tasks.filter(
      (t) => t._id.toString() !== taskId
    );

    // 🧠 ADD to destination
    destinationColumn.tasks.push(task);

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "TASK_MOVED",
      meta: {
        taskTitle: task.title,
        from: fromColumnTitle,
        to: toColumnTitle,
      },
    });

    const io = getIO();
    io.to(board._id.toString()).emit("task:moved", {
      boardId: board._id,
      taskId: task._id,
      fromColumnId: sourceColumn._id,
      toColumnId: destinationColumn._id,
    });

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
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "MEMBER_ADDED",
      meta: {
        addedUser: userToAdd._id,
        role: "member",
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("member:added", {
      boardId: board._id,
      member: {
        id: userToAdd._id,
        email: userToAdd.email,
        name: userToAdd.name,
      },
    });
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
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_SOFT_DELETED",
      meta: { deletedFor: userId, },

    });
    const io = getIO();
    io.to(board._id.toString()).emit("board:softDeleted", {
  boardId,
  userId,
});

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
await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_DELETED_PERMANENT",
      meta: { deletedFor: userId, },
    });
    await board.deleteOne();
    // await ActivityLog.create({
    //   board: board._id,
    //   user: req.user._id,
    //   action: "BOARD_DELETED_PERMANENT",
    //   meta: { deletedFor: userId, },
    // });
    const io = getIO();
    io.emit("board:permanentlyDeleted", { boardId: board._id });

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
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "MEMBER_REMOVED",
      meta: {
        removedUser: userId,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("member:removed", {
      boardId: board._id,
      userId,
    });

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


// CHANGE MEMBER ROLE (OWNER ONLY)
exports.changeMemberRole = async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user._id;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Only owner can change roles
    if (board.createdBy.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only owner can change member roles" });
    }

    // 🔒 Owner role cannot be changed
    if (board.createdBy.toString() === userId) {
      return res
        .status(400)
        .json({ message: "Owner role cannot be changed" });
    }

    const member = board.members.find(
      (m) => m.user.toString() === userId
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found in board" });
    }

    member.role = role;
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "MEMBER_ROLE_CHANGED",
      meta: {
        targetUser: userId,
        newRole: role,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("member:roleChanged", {
      boardId: board._id,
      userId,
      role,
    });
    res.status(200).json({
      message: "Member role updated successfully",
      userId,
      role,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to change member role",
      error: error.message,
    });
  }
};


// EDIT BOARD (OWNER OR ADMIN)
exports.editBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title } = req.body;
    const userId = req.user._id;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Board title is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const isOwner = board.createdBy.toString() === userId.toString();

    const isAdmin = board.members.some(
      (m) =>
        m.user.toString() === userId.toString() &&
        m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only owner or admin can edit board" });
    }

    board.title = title;
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_EDITED",
      meta: { newTitle: board.title },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("board:edited", {
      boardId: board._id,
      title: board.title,
    });

    res.status(200).json({
      message: "Board updated successfully",
      boardId: board._id,
      title: board.title,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to edit board",
      error: error.message,
    });
  }
};


// VIEW BOARD MEMBERS
exports.getBoardMembers = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Check if user is owner or member
    const isOwner = board.createdBy._id.toString() === userId.toString();
    const isMember = board.members.some(
      (m) => m.user._id.toString() === userId.toString()
    );

    if (!isOwner && !isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this board" });
    }

    res.status(200).json({
      owner: {
        _id: board.createdBy._id,
        name: board.createdBy.name,
        email: board.createdBy.email,
        role: "owner",
      },
      members: board.members.map((m) => ({
        _id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch board members",
      error: error.message,
    });
  }
};


// LEAVE BOARD (MEMBER / ADMIN ONLY)
exports.leaveBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Owner cannot leave
    if (board.createdBy.toString() === userId.toString()) {
      return res.status(400).json({
        message: "Owner cannot leave the board",
      });
    }

    const memberIndex = board.members.findIndex(
      (m) => m.user.toString() === userId.toString()
    );

    if (memberIndex === -1) {
      return res.status(403).json({
        message: "You are not a member of this board",
      });
    }

    board.members.splice(memberIndex, 1);
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "MEMBER_LEFT",
      meta: {
        leftUser: userId,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("member:left", {
      boardId: board._id,
      userId,
    });
    res.status(200).json({
      message: "You have left the board successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to leave board",
      error: error.message,
    });
  }
};


// MARK BOARD AS COMPLETED (OWNER OR ADMIN)
exports.completeBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const isOwner = board.createdBy.toString() === userId.toString();
    const isAdmin = board.members.some(
      (m) =>
        m.user.toString() === userId.toString() &&
        m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Only owner or admin can complete the board",
      });
    }

    board.status = "completed";
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_COMPLETED",
      meta: { completedBy: userId, },
    });

    const io = getIO();
    io.to(board._id.toString()).emit("board:completed", {
      boardId: board._id,
      status: board.status,
    });

    res.status(200).json({
      message: "Board marked as completed",
      status: board.status,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to complete board",
      error: error.message,
    });
  }
};


// EDIT TASK (ANY BOARD MEMBER)
exports.editTask = async (req, res) => {
  try {
    const { boardId, columnId, taskId } = req.params;
    const { title, description } = req.body;
    const userId = req.user._id;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Task title is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Check board membership
    const isMember =
      board.createdBy.toString() === userId.toString() ||
      board.members.some(
        (m) => m.user.toString() === userId.toString()
      );

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a board member" });
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    const task = column.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // ✅ Update allowed fields
    task.title = title;
    if (description !== undefined) {
      task.description = description;
    }

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "TASK_EDITED",
      meta: {
        taskId,
        updatedFields: Object.keys(req.body),
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("task:edited", {
      boardId: board._id,
      columnId: column._id,
      task,
    });
    res.status(200).json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to edit task",
      error: error.message,
    });
  }
};


// DELETE TASK (ANY BOARD MEMBER)
exports.deleteTask = async (req, res) => {
  try {
    const { boardId, columnId, taskId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Check board membership
    const isMember =
      board.createdBy.toString() === userId.toString() ||
      board.members.some(
        (m) => m.user.toString() === userId.toString()
      );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a board member",
      });
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    const taskExists = column.tasks.some(
      (t) => t._id.toString() === taskId
    );

    if (!taskExists) {
      return res.status(404).json({ message: "Task not found" });
    }
    const task = column.tasks.find(t => t._id.toString() === taskId);
    const taskTitle = task.title;
    const columnTitle = column.title;


    // ✅ Proper way to delete embedded task
    column.tasks = column.tasks.filter(
      (t) => t._id.toString() !== taskId
    );

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "TASK_DELETED",
      meta: {
        taskTitle,
        columnTitle,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("task:deleted", {
      boardId: board._id,
      columnId: column._id,
      taskId,
    });
    res.status(200).json({
      message: "Task deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete task",
      error: error.message,
    });
  }
};


// REORDER TASKS WITHIN SAME COLUMN
exports.reorderTasks = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;
    const { sourceIndex, destinationIndex } = req.body;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const column = board.columns.id(columnId);
    if (!column) return res.status(404).json({ message: "Column not found" });

    const tasks = column.tasks;

    if (
      sourceIndex < 0 ||
      destinationIndex < 0 ||
      sourceIndex >= tasks.length ||
      destinationIndex >= tasks.length
    ) {
      return res.status(400).json({ message: "Invalid indexes" });
    }

    // 🔥 SAFE REORDER
    const [movedTask] = tasks.splice(sourceIndex, 1);
    tasks.splice(destinationIndex, 0, movedTask);

    await board.save({ validateBeforeSave: false });// no validation triggered
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "TASK_REORDERED",
      meta: {
        columnTitle: column.title,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("task:reordered", {
      boardId: board._id,
      columnId: column._id,
      tasks,
    });

    res.json({ message: "Tasks reordered successfully", tasks });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reorder tasks",
      error: error.message,
    });
  }
};


// ASSIGN TASK TO MEMBER
exports.assignTask = async (req, res) => {
  try {
    const { boardId, columnId, taskId } = req.params;
    const { userId } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check requester is board member
    const isMember =
      board.createdBy.toString() === req.user._id.toString() ||
      board.members.some(
        (m) => m.user.toString() === req.user._id.toString()
      );

    if (!isMember) {
      return res.status(403).json({ message: "Not a board member" });
    }

    // Check assignee is board member
    const isAssigneeMember =
      board.createdBy.toString() === userId ||
      board.members.some((m) => m.user.toString() === userId);

    if (!isAssigneeMember) {
      return res
        .status(400)
        .json({ message: "Assignee must be board member" });
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    const task = column.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.assignedTo = userId;
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "TASK_ASSIGNED",
      meta: {
        taskTitle: task.title,
        assignedTo: userId,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("task:assigned", {
      boardId: board._id,
      columnId: column._id,
      task,
    });

    res.json({ message: "Task assigned successfully", task });
  } catch (error) {
    res.status(500).json({
      message: "Failed to assign task",
      error: error.message,
    });
  }
};

exports.renameColumn = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Column title is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // permission check (owner or admin)
    const isOwner =
      board.createdBy.toString() === req.user._id.toString();

    const isAdmin = board.members.some(
      (m) =>
        m.user.toString() === req.user._id.toString() &&
        m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not allowed to rename column" });
    }

    const column = board.columns.id(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    column.title = title;
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COLUMN_RENAMED",
      meta: {
        columnId,
        newTitle: title,
      },
    });

    const io = getIO();
    io.to(board._id.toString()).emit("column:renamed", {
      boardId: board._id,
      column,
    });
    res.json({
      message: "Column renamed successfully",
      column,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to rename column",
      error: error.message,
    });
  }
};

exports.reorderColumns = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { sourceIndex, destinationIndex } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // permission: owner or admin
    const isOwner =
      board.createdBy.toString() === req.user._id.toString();

    const isAdmin = board.members.some(
      (m) =>
        m.user.toString() === req.user._id.toString() &&
        m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not allowed to reorder columns" });
    }

    if (
      sourceIndex < 0 ||
      destinationIndex < 0 ||
      sourceIndex >= board.columns.length ||
      destinationIndex >= board.columns.length
    ) {
      return res.status(400).json({ message: "Invalid indexes" });
    }

    const [movedColumn] = board.columns.splice(sourceIndex, 1);
    board.columns.splice(destinationIndex, 0, movedColumn);

    // recalculate order
    board.columns.forEach((col, index) => {
      col.order = index + 1;
    });

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COLUMNS_REORDERED",
    });
    const io = getIO();
    io.to(board._id.toString()).emit("columns:reordered", {
      boardId: board._id,
      columns: board.columns,
    });

    res.json({
      message: "Columns reordered successfully",
      columns: board.columns,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reorder columns",
      error: error.message,
    });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { boardId, columnId, taskId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    // board member check
    const isMember =
      board.createdBy.toString() === req.user._id.toString() ||
      board.members.some(
        (m) => m.user.toString() === req.user._id.toString()
      );

    if (!isMember) {
      return res.status(403).json({ message: "Not a board member" });
    }

    const column = board.columns.id(columnId);
    if (!column) return res.status(404).json({ message: "Column not found" });

    const task = column.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.comments.push({
      text,
      user: req.user._id,
    });

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COMMENT_ADDED",
      meta: {
        taskId,
        commentText: text,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("comment:added", {
      boardId: board._id,
      columnId: column._id,
      taskId,
      comment: task.comments[task.comments.length - 1],
    });
    res.status(201).json({
      message: "Comment added",
      comments: task.comments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add comment",
      error: error.message,
    });
  }
};

exports.editComment = async (req, res) => {
  try {
    const { boardId, columnId, taskId, commentId } = req.params;
    const { text } = req.body;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const column = board.columns.id(columnId);
    if (!column) return res.status(404).json({ message: "Column not found" });

    const task = column.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const comment = task.comments.id(commentId);
    if (!comment)
      return res.status(404).json({ message: "Comment not found" });

    // only comment owner
    if (comment.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not allowed to edit this comment" });
    }

    comment.text = text;
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COMMENT_EDITED",
      meta: {
        taskId,
        commentId,
      },
    });

    const io = getIO();
    io.to(board._id.toString()).emit("comment:edited", {
      boardId: board._id,
      columnId: column._id,
      taskId,
      comment,
    });
    res.json({ message: "Comment updated", comment });
  } catch (error) {
    res.status(500).json({
      message: "Failed to edit comment",
      error: error.message,
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { boardId, columnId, taskId, commentId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const column = board.columns.id(columnId);
    if (!column) return res.status(404).json({ message: "Column not found" });

    const task = column.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const comment = task.comments.id(commentId);
    if (!comment)
      return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not allowed to delete this comment" });
    }

    task.comments = task.comments.filter(
      (c) => c._id.toString() !== commentId
    );

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COMMENT_DELETED",
      meta: {
        taskId,
        commentId,
      },
    });
    const io = getIO();
    io.to(board._id.toString()).emit("comment:deleted", {
      boardId: board._id,
      columnId: column._id,
      taskId,
      commentId,
    });

    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};


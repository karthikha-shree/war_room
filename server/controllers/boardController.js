const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const Board = require("../models/Board");
const ActivityLog = require("../models/ActivityLog");
const { isBoardMember } = require("../utils/boardPermissions");
const { getIO } = require("../socket");
const sendEmail = require("../utils/sendEmail");


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
          role: "owner",
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
      .populate("members.user", "name email")
      .populate("columns.tasks.assignedTo", "name email")
      .populate("columns.tasks.assignedMembers", "name email")
      .populate("columns.tasks.comments.user", "name email");

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

    // Sort columns by order ascending
    if (board.columns && board.columns.length > 0) {
      board.columns.sort((a, b) => a.order - b.order);
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: "Server error", err: error.stack });
  }
};


// ADD MEMBER TO BOARD
exports.addMemberToBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { email, role } = req.body;

    console.log("\n========================================");
    console.log("🔷 ADD MEMBER REQUEST RECEIVED");
    console.log("========================================");
    console.log("📋 Board ID:", boardId);
    console.log("📧 Email to add:", email);
    console.log("👤 Role:", role);
    console.log("👮 Requester ID:", req.user._id);
    console.log("========================================\n");

    // Validate input
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: "Role must be either 'admin' or 'member'" });
    }

    // Find board
    const board = await Board.findById(boardId).populate("members.user", "name email");
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check if requester is owner or admin
    const requesterMember = board.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    if (!requesterMember || !['owner', 'admin'].includes(requesterMember.role)) {
      return res.status(403).json({ message: "Only board owners and admins can add members" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    console.log(`🔍 Searching for user with email: ${email}`);
    console.log(`🔍 User found: ${user ? 'YES (will add directly)' : 'NO (will send invitation email)'}`);

    if (user) {
      // User exists - add to members
      
      console.log(`✅ User ${email} exists in database - adding directly to board`);
      
      // Check if user is already a member
      const isAlreadyMember = board.members.some(
        (m) => m.user._id.toString() === user._id.toString()
      );

      if (isAlreadyMember) {
        return res.status(400).json({ message: "User already a member" });
      }

      // Add user to members
      board.members.push({
        user: user._id,
        role: role,
      });

      await board.save();

      // Populate and return updated board
      const updatedBoard = await Board.findById(boardId)
        .populate("createdBy", "name email")
        .populate("members.user", "name email");

      // Log activity
      await ActivityLog.create({
        board: board._id,
        user: req.user._id,
        action: "MEMBER_ADDED",
        meta: { memberEmail: email, role: role },
      });

      console.log(`✅ User ${email} successfully added to board`);
      res.status(200).json({
        ...updatedBoard.toObject(),
        message: `${user.name} added to board successfully`,
        details: `${user.name} (${email}) has been added to the board as a ${role}.`
      });
    } else {
      // User does not exist - add to invitedMembers
      
      console.log(`📧 User ${email} NOT found - will send invitation email`);
      
      // Check if email is already invited
      const isAlreadyInvited = board.invitedMembers.some(
        (invite) => invite.email.toLowerCase() === email.toLowerCase()
      );

      if (isAlreadyInvited) {
        return res.status(400).json({ message: "User is already invited to this board" });
      }

      // Add to invitedMembers
      board.invitedMembers.push({
        email: email.toLowerCase(),
        role: role,
        invitedAt: new Date(),
      });

      await board.save();

      // Send invitation email
      const registerLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/register?invite=${encodeURIComponent(email)}&board=${boardId}`;
      
      console.log(`📧 Attempting to send invitation email to: ${email}`);
      console.log(`📧 Register link: ${registerLink}`);
      console.log(`📧 Email config check - MAIL_HOST: ${process.env.MAIL_HOST}`);
      console.log(`📧 Email config check - MAIL_USER: ${process.env.MAIL_USER}`);
      
      try {
        console.log("📧 Step 1: Calling sendEmail function...");
        const emailResult = await sendEmail({
          to: email,
          subject: `You're invited to War Room - ${board.title}`,
          text: `Hello!\n\nYou've been invited to join the board "${board.title}" on War Room as a ${role}.\n\nWar Room is currently invite-only. Please register using the link below to accept this invitation:\n\n${registerLink}\n\nAfter registering, you'll automatically be added to the board.\n\nBest regards,\nWar Room Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e40af;">You're invited to War Room!</h2>
              <p>Hello!</p>
              <p>You've been invited to join the board "<strong>${board.title}</strong>" as a <strong>${role}</strong>.</p>
              <p><strong>War Room</strong> is currently invite-only. Please register to accept this invitation and start collaborating!</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${registerLink}" 
                   style="display: inline-block; 
                          padding: 12px 30px; 
                          background-color: #2563eb; 
                          color: white; 
                          text-decoration: none; 
                          border-radius: 8px;
                          font-weight: bold;">
                  Register & Join Board
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy this link: <br><code>${registerLink}</code></p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 12px;">After registering, you'll automatically be added to the board and can start managing tasks!</p>
            </div>
          `,
        });
        console.log(`✅ SUCCESS! Invitation email sent to ${email}`);
        console.log(`✅ Email message ID: ${emailResult?.messageId}`);
      } catch (emailError) {
        console.error(`\n❌❌❌ CRITICAL ERROR SENDING EMAIL ❌❌❌`);
        console.error(`❌ Failed to send invitation email to: ${email}`);
        console.error(`❌ Error name:`, emailError.name);
        console.error(`❌ Error message:`, emailError.message);
        console.error(`❌ Error code:`, emailError.code);
        console.error(`❌ Full error object:`, JSON.stringify(emailError, null, 2));
        console.error(`❌ Stack trace:`, emailError.stack);
        console.error(`❌❌❌ END ERROR DETAILS ❌❌❌\n`);
        
        // Return error to frontend so user knows email failed
        return res.status(500).json({ 
          message: "Failed to send invitation email",
          error: emailError.message,
          details: `The user was added to invited list, but the email could not be sent. Error: ${emailError.message}`
        });
      }

      // Log activity
      await ActivityLog.create({
        board: board._id,
        user: req.user._id,
        action: "MEMBER_INVITED",
        meta: { invitedEmail: email, role: role },
      });

      res.status(200).json({ 
        message: "Invitation email sent", 
        details: `An invitation has been sent to ${email}. They will be added to the board once they register.`
      });
    }
  } catch (error) {
    console.error("ADD MEMBER ERROR:", error);
    res.status(500).json({ message: "Failed to add member", error: error.message });
  }
};


// CHANGE MEMBER ROLE
exports.changeMemberRole = async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const { role } = req.body;

    // Validate input
    if (!userId || !role) {
      return res.status(400).json({ message: "userId and role are required" });
    }

    // Validate role
    if (!['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ message: "Role must be 'owner', 'admin', or 'member'" });
    }

    // Find board
    const board = await Board.findById(boardId).populate("members.user", "name email");
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check if requester is owner
    const requesterMember = board.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    if (!requesterMember || requesterMember.role !== 'owner') {
      return res.status(403).json({ message: "Only board owner can change member roles" });
    }

    // Find the member to update
    const memberToUpdate = board.members.find(
      (m) => m.user._id.toString() === userId.toString()
    );

    if (!memberToUpdate) {
      return res.status(404).json({ message: "Member not found in this board" });
    }

    // Cannot change owner role
    if (memberToUpdate.role === 'owner') {
      return res.status(403).json({ message: "Cannot change owner role" });
    }

    // Update the role
    memberToUpdate.role = role;
    await board.save();

    // Populate and return updated board
    const updatedBoard = await Board.findById(boardId)
      .populate("createdBy", "name email")
      .populate("members.user", "name email");

    // Log activity
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "MEMBER_ROLE_CHANGED",
      meta: { 
        memberId: userId, 
        memberEmail: memberToUpdate.user.email,
        newRole: role 
      },
    });

    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error("CHANGE MEMBER ROLE ERROR:", error);
    res.status(500).json({ message: "Failed to change member role", error: error.message });
  }
};


// REMOVE MEMBER
exports.removeMember = async (req, res) => {
  try {
    const { boardId, userId } = req.params;

    // Validate input
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Find board
    const board = await Board.findById(boardId).populate("members.user", "name email");
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Find requester member
    const requesterMember = board.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    if (!requesterMember) {
      return res.status(403).json({ message: "You are not a member of this board" });
    }

    // Find the member to remove
    const memberToRemove = board.members.find(
      (m) => m.user._id.toString() === userId.toString()
    );

    if (!memberToRemove) {
      return res.status(404).json({ message: "Member not found in this board" });
    }

    // Cannot remove owner
    if (memberToRemove.role === 'owner') {
      return res.status(403).json({ message: "Cannot remove board owner" });
    }

    // Check permissions
    if (requesterMember.role === 'owner') {
      // Owner can remove admin or member
      if (!['admin', 'member'].includes(memberToRemove.role)) {
        return res.status(403).json({ message: "Invalid operation" });
      }
    } else if (requesterMember.role === 'admin') {
      // Admin can only remove member
      if (memberToRemove.role !== 'member') {
        return res.status(403).json({ message: "Admins can only remove members" });
      }
    } else {
      // Members cannot remove anyone
      return res.status(403).json({ message: "You do not have permission to remove members" });
    }

    // Remove member from array
    board.members = board.members.filter(
      (m) => m.user._id.toString() !== userId.toString()
    );

    await board.save();

    // Populate and return updated board
    const updatedBoard = await Board.findById(boardId)
      .populate("createdBy", "name email")
      .populate("members.user", "name email");

    // Log activity
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "MEMBER_REMOVED",
      meta: { 
        memberId: userId,
        memberEmail: memberToRemove.user.email,
        memberRole: memberToRemove.role
      },
    });

    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error("REMOVE MEMBER ERROR:", error);
    res.status(500).json({ message: "Failed to remove member", error: error.message });
  }
};


// LEAVE BOARD
exports.leaveBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    // Find board
    const board = await Board.findById(boardId).populate("members.user", "name email");
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Find the user's membership
    const userMember = board.members.find(
      (m) => m.user._id.toString() === userId.toString()
    );

    if (!userMember) {
      return res.status(404).json({ message: "You are not a member of this board" });
    }

    // Check if user is owner
    if (userMember.role === 'owner') {
      // Count how many owners exist
      const ownerCount = board.members.filter((m) => m.role === 'owner').length;
      
      if (ownerCount === 1) {
        return res.status(403).json({ 
          message: "Cannot leave board. You are the only owner. Please assign another owner first or delete the board." 
        });
      }
    }

    // Remove user from members
    board.members = board.members.filter(
      (m) => m.user._id.toString() !== userId.toString()
    );

    await board.save();

    // Log activity
    await ActivityLog.create({
      board: board._id,
      user: userId,
      action: "MEMBER_LEFT",
      meta: { 
        userEmail: userMember.user.email,
        userRole: userMember.role
      },
    });

    res.status(200).json({ message: "Successfully left the board" });
  } catch (error) {
    console.error("LEAVE BOARD ERROR:", error);
    res.status(500).json({ message: "Failed to leave board", error: error.message });
  }
};


// CANCEL INVITATION
// DELETE /boards/:boardId/invitations
exports.cancelInvitation = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { email } = req.body;
    const userId = req.user._id;

    // Validate email
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find the board
    const board = await Board.findById(boardId).populate("members.user");
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check if user is a member
    const currentUserMember = board.members.find(
      (m) => m.user._id.toString() === userId.toString()
    );

    if (!currentUserMember) {
      return res.status(403).json({ message: "You are not a member of this board" });
    }

    // Only owner and admin can cancel invitations
    if (currentUserMember.role !== "owner" && currentUserMember.role !== "admin") {
      return res.status(403).json({ 
        message: "Only owners and admins can cancel invitations" 
      });
    }

    // Find the invitation
    const invitationIndex = board.invitedMembers.findIndex(
      (inv) => inv.email.toLowerCase() === email.toLowerCase()
    );

    if (invitationIndex === -1) {
      return res.status(404).json({ 
        message: "Invitation not found" 
      });
    }

    // Remove the invitation
    const removedInvitation = board.invitedMembers[invitationIndex];
    board.invitedMembers.splice(invitationIndex, 1);
    await board.save();

    // Log activity
    await ActivityLog.create({
      board: board._id,
      user: userId,
      action: "INVITATION_CANCELLED",
      meta: { 
        cancelledEmail: email,
        invitedRole: removedInvitation.role
      },
    });

    res.status(200).json({ 
      message: "Invitation cancelled successfully",
      email: email
    });
  } catch (error) {
    console.error("CANCEL INVITATION ERROR:", error);
    res.status(500).json({ 
      message: "Failed to cancel invitation", 
      error: error.message 
    });
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

    // Socket event removed - frontend updates locally
    // const io = getIO();
    // const createdTask = column.tasks[column.tasks.length - 1];
    // io.to(board._id.toString()).emit("task:created", {
    //   boardId: board._id,
    //   columnId: column._id,
    //   task: createdTask,
    // });

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
    
    // Socket event removed - frontend updates locally
    // const io = getIO();
    // io.to(board._id.toString()).emit("column:created", {
    //   boardId: board._id,
    //   column: board.columns[board.columns.length - 1],
    // });

    res.status(201).json({
      message: "Column created",
      board: board,
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

    const columnTitle = column.title;

    // Use pull instead of remove
    board.columns.pull(columnId);

    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COLUMN_DELETED",
      meta: {
        columnId,
        columnTitle: columnTitle,
      },
    });

    // Socket event removed - frontend updates locally
    // const io = getIO();
    // io.to(board._id.toString()).emit("column:deleted", {
    //   boardId: board._id,
    //   columnId,
    // });

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

// RESTORE SOFT DELETED BOARD (REMOVE USER FROM DELETEFOR ARRAY)
exports.restoreSoftDeletedBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check if user has access to this board (is member or owner)
    const isOwner = board.createdBy.toString() === userId.toString();
    const isMember = board.members.some(
      (m) => m.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "You don't have access to this board" });
    }

    // Check if board is actually soft deleted for this user
    if (!board.deletedFor.includes(userId)) {
      return res.status(400).json({ message: "Board is not deleted for you" });
    }

    // Remove user from deletedFor array
    board.deletedFor = board.deletedFor.filter(
      (id) => id.toString() !== userId.toString()
    );
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_SOFT_DELETE_RESTORED",
      meta: { restoredFor: userId, },
    });

    const io = getIO();
    io.to(board._id.toString()).emit("board:softDeleteRestored", {
      boardId,
      userId,
    });

    res.status(200).json({
      message: "Board restored to your view",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to restore board",
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

    // Create activity log before deletion
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_DELETED_PERMANENT",
      meta: { deletedFor: userId, },
    });

    // Delete the board
    await board.deleteOne();

    const io = getIO();
    io.emit("board:permanentlyDeleted", { boardId: board._id });

    res.status(200).json({
      message: "Board permanently deleted",
    });
  } catch (error) {
    console.error("Error in permanentDeleteBoard:", error);
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

    // 🔒 Only owner or admin can remove members
    const isOwner = board.createdBy.toString() === currentUserId.toString();
    const isAdmin = board.members.some(
      (m) => m.user.toString() === currentUserId.toString() && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only owner or admin can remove members" });
    }

    // 🔒 Admins cannot remove other admins or owner
    if (isAdmin && !isOwner) {
      const targetMember = board.members.find((m) => m.user.toString() === userId);
      if (targetMember && targetMember.role === "admin") {
        return res.status(403).json({ message: "Admins cannot remove other admins" });
      }
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

    console.log("\n========================================");
    console.log("📝 EDIT BOARD REQUEST RECEIVED");
    console.log("========================================");
    console.log("📋 Board ID:", boardId);
    console.log("✏️ New Title:", title);
    console.log("👤 User ID:", userId);
    console.log("========================================\n");

    if (!title || title.trim() === "") {
      console.log("❌ Error: Board title is empty");
      return res.status(400).json({ message: "Board title is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      console.log("❌ Error: Board not found");
      return res.status(404).json({ message: "Board not found" });
    }

    console.log("✅ Board found:", board.title);

    const isOwner = board.createdBy.toString() === userId.toString();
    console.log("👑 Is Owner:", isOwner);

    const isAdmin = board.members.some(
      (m) =>
        m.user.toString() === userId.toString() &&
        m.role === "admin"
    );
    console.log("🔐 Is Admin:", isAdmin);

    if (!isOwner && !isAdmin) {
      console.log("❌ Error: User is not owner or admin");
      return res
        .status(403)
        .json({ message: "Only owner or admin can edit board" });
    }

    console.log("✅ User has permission to edit");

    board.title = title;
    await board.save();
    
    console.log("✅ Board title updated successfully");

    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_UPDATED",
      meta: { newTitle: board.title },
    });
    
    console.log("✅ Activity log created");

    // Socket event removed - frontend updates locally
    // const io = getIO();
    // io.to(board._id.toString()).emit("board:edited", {
    //   boardId: board._id,
    //   title: board.title,
    // });

    console.log("✅ Responding to client");
    console.log("========================================\n");

    res.status(200).json({
      message: "Board updated successfully",
      boardId: board._id,
      title: board.title,
    });
  } catch (error) {
    console.error("\n❌❌❌ EDIT BOARD ERROR ❌❌❌");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("❌❌❌ END ERROR ❌❌❌\n");
    
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

// GET BOARD INVITATIONS
exports.getBoardInvitations = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user._id;

    const board = await Board.findById(boardId)
      .populate("createdBy", "name email");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔒 Check if user is owner or member  
    const isOwner = board.createdBy._id.toString() === userId.toString();
    const isMember = board.members.some(
      (m) => m.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this board" });
    }

    res.status(200).json({
      invitations: board.invitedMembers || []
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch board invitations",
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

// RESTORE BOARD (CHANGE STATUS FROM COMPLETED BACK TO ACTIVE)
exports.restoreBoard = async (req, res) => {
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
        message: "Only owner or admin can restore the board",
      });
    }

    board.status = "active";
    await board.save();
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "BOARD_RESTORED",
      meta: { restoredBy: userId, },
    });

    const io = getIO();
    io.to(board._id.toString()).emit("board:restored", {
      boardId: board._id,
      status: board.status,
    });

    res.status(200).json({
      message: "Board restored to active status",
      status: board.status,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to restore board",
      error: error.message,
    });
  }
};


// EDIT TASK (ANY BOARD MEMBER)
exports.editTask = async (req, res) => {
  try {
    const { boardId, columnId, taskId } = req.params;
    const { title, description, assignedMembers } = req.body;
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
    if (assignedMembers !== undefined) {
      task.assignedMembers = assignedMembers;
    }

    await board.save();
    
    // Populate task with user data for assigned members
    await Board.populate(board, {
      path: 'columns.tasks.assignedMembers',
      select: 'name email'
    });
    
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "TASK_UPDATED",
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

    // Socket event removed - frontend updates locally
    // const io = getIO();
    // io.to(board._id.toString()).emit("column:renamed", {
    //   boardId: board._id,
    //   column,
    // });
    
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
    const { lists } = req.body;

    if (!lists || !Array.isArray(lists)) {
      return res.status(400).json({ message: "Lists array is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // permission: owner, admin, or member
    const isOwner = board.createdBy.toString() === req.user._id.toString();
    const memberInfo = board.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    const isAdmin = memberInfo && memberInfo.role === "admin";
    const isMember = memberInfo && memberInfo.role === "member";

    if (!isOwner && !isAdmin && !isMember) {
      return res
        .status(403)
        .json({ message: "Not allowed to reorder columns" });
    }

    // Update order for each column
    lists.forEach((item) => {
      const column = board.columns.id(item._id);
      if (column) {
        column.order = item.order;
      }
    });

    await board.save();
    
    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "COLUMN_REORDERED",
    });

    // Sort columns by order ascending
    board.columns.sort((a, b) => a.order - b.order);

    res.json({
      message: "Columns reordered successfully",
      board: board,
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
    
    // Populate the newly added comment with user data
    await Board.populate(board, {
      path: 'columns.tasks.comments.user',
      select: 'name email'
    });
    
    const newComment = task.comments[task.comments.length - 1];
    
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
      comment: newComment,
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
    
    // Populate the updated comment with user data
    await Board.populate(board, {
      path: 'columns.tasks.comments.user',
      select: 'name email'
    });
    
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

const parseGitHubRepoUrl = (repoUrl) => {
  try {
    const parsed = new URL(repoUrl);

    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return null;
    }

    const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, "");
    const parts = cleanPath.split("/");

    if (parts.length < 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch (error) {
    return null;
  }
};

// PATCH /boards/:boardId/github
exports.updateBoardGitHubRepo = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { githubRepo } = req.body;

    if (!githubRepo || typeof githubRepo !== "string") {
      return res.status(400).json({ message: "GitHub repository URL is required" });
    }

    const parsedRepo = parseGitHubRepoUrl(githubRepo.trim());
    if (!parsedRepo) {
      return res.status(400).json({ message: "Invalid GitHub repository URL" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (!isBoardMember(board, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    board.githubRepo = githubRepo.trim();
    await board.save();

    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "GITHUB_REPO_UPDATED",
      meta: {
        githubRepo: board.githubRepo,
      },
    });

    return res.status(200).json(board);
  } catch (error) {
    console.error("UPDATE BOARD GITHUB REPO ERROR:", error);
    return res.status(500).json({
      message: "Failed to update GitHub repository",
      error: error.message,
    });
  }
};

// GET /boards/:boardId/github
exports.getBoardGitHubData = async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (!isBoardMember(board, req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!board.githubRepo) {
      return res.status(400).json({ message: "No GitHub repository linked to this board" });
    }

    const parsedRepo = parseGitHubRepoUrl(board.githubRepo);
    if (!parsedRepo) {
      return res.status(400).json({ message: "Invalid GitHub repository URL" });
    }

    const { owner, repo } = parsedRepo;
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const requestHeaders = {
      Accept: "application/vnd.github+json",
      "User-Agent": "war-room-app",
    };

    const repoResponse = await fetch(baseUrl, { headers: requestHeaders });

    if (repoResponse.status === 404) {
      return res.status(404).json({ message: "GitHub repository not found" });
    }

    if (!repoResponse.ok) {
      return res.status(502).json({ message: "GitHub API failure" });
    }

    const [repoData, commitsResponse, pullsResponse] = await Promise.all([
      repoResponse.json(),
      fetch(`${baseUrl}/commits?per_page=5`, { headers: requestHeaders }),
      fetch(`${baseUrl}/pulls?state=open`, { headers: requestHeaders }),
    ]);

    if (!commitsResponse.ok || !pullsResponse.ok) {
      return res.status(502).json({ message: "GitHub API failure" });
    }

    const [commitsData, pullsData] = await Promise.all([
      commitsResponse.json(),
      pullsResponse.json(),
    ]);

    await ActivityLog.create({
      board: board._id,
      user: req.user._id,
      action: "GITHUB_DATA_FETCHED",
      meta: {
        githubRepo: board.githubRepo,
        repo: repoData.full_name,
      },
    });

    return res.status(200).json({
      repo: {
        name: repoData.full_name,
        stars: repoData.stargazers_count,
        updatedAt: repoData.updated_at,
        url: repoData.html_url,
      },
      commits: (Array.isArray(commitsData) ? commitsData : []).slice(0, 5).map((commit) => ({
        message: commit?.commit?.message || "",
        author: commit?.commit?.author?.name || "Unknown",
        date: commit?.commit?.author?.date || null,
      })),
      pulls: (Array.isArray(pullsData) ? pullsData : []).map((pull) => ({
        title: pull?.title || "",
        user: pull?.user?.login || "Unknown",
        status: pull?.state || "open",
        url: pull?.html_url || "",
      })),
    });
  } catch (error) {
    console.error("GET BOARD GITHUB DATA ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch GitHub data",
      error: error.message,
    });
  }
};


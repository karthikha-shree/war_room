const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        // TASK
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_DELETED",
        "TASK_MOVED",
        "TASK_REORDERED",
        "TASK_ASSIGNED",

        // COMMENTS
        "COMMENT_ADDED",
        "COMMENT_DELETED",

        // COLUMNS
        "COLUMN_CREATED",
        "COLUMN_RENAMED",
        "COLUMN_DELETED",
        "COLUMN_REORDERED",

        // MEMBERS
        "MEMBER_ADDED",
        "MEMBER_REMOVED",
        "MEMBER_ROLE_CHANGED",

        // BOARD
        "BOARD_CREATED",
        "BOARD_UPDATED",
        "BOARD_COMPLETED",
      ],
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);

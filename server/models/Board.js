// const mongoose = require("mongoose");

// // Comment schema
// const commentSchema = new mongoose.Schema({
//   text: {
//     type: String,
//     required: true,
//   },
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Task schema
// const taskSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//   },
//   description: String,
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   comments: [commentSchema],
// });

// // Column schema
// const columnSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//   },
//   order: Number,
//   tasks: [taskSchema],
// });

// // Board schema
// const boardSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//   },

//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },

//   members: [
//     {
//       user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//       },
//       role: {
//         type: String,
//         enum: ["admin", "member"],
//         default: "member",
//       },
//     },
//   ],

//   columns: [columnSchema],

//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// module.exports = mongoose.model("Board", boardSchema);
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  assignedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  comments: [commentSchema],
});

const columnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  tasks: [taskSchema],
});

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
      },
    ],

    invitedMembers: [
      {
        email: String,
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        invitedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },

    githubRepo: {
      type: String,
      trim: true,
      default: "",
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    columns: [columnSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);

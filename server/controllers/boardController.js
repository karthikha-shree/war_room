const Board = require("../models/Board");


exports.createBoard = async (req, res) => {
  try {
    const board = new Board({
      title: req.body.title,
      columns: [
        { title: "To Do", order: 1, tasks: [] },
        { title: "In Progress", order: 2, tasks: [] },
        { title: "Done", order: 3, tasks: [] }
      ]
    });

    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message ,message:"Error in creating board" });
  }
};

// Creates default columns

// Saves board to MongoDB

exports.getBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message ,message:"Error in fetching board"});
  }
};
// Fetches board by ID

exports.addTask = async (req, res) => {
  try {
    const { boardId, columnIndex } = req.params;
    const { title, description } = req.body;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    board.columns[columnIndex].tasks.push({
      title,
      description,
      comments: []
    });

    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Adds a task to a specific column in the board\

//to move the created task between columns
exports.moveTask = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { fromColumn, toColumn, taskIndex } = req.body;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const task = board.columns[fromColumn].tasks.splice(taskIndex, 1)[0];
    board.columns[toColumn].tasks.push(task);

    await board.save();
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Moves a task from one column to another within the board
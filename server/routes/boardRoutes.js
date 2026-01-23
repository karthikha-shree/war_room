const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");


router.post("/", boardController.createBoard);
router.post("/:boardId/columns/:columnIndex/tasks", boardController.addTask);
router.get("/:id", boardController.getBoard);
router.put("/:boardId/move-task", boardController.moveTask);


module.exports = router;

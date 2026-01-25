const isBoardMember = (board, userId) => {
  return (
    board.createdBy.toString() === userId.toString() ||
    board.members.some(
      (m) => m.user.toString() === userId.toString()
    )
  );
};

module.exports = { isBoardMember };

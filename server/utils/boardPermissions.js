const isBoardMember = (board, userId) => {
  const uid = userId.toString();

  // 🔒 soft-deleted users blocked first
  if (board.deletedFor?.map(String).includes(uid)) return false;

  // 👑 owner check (works populated & non-populated)
  if (
    board.createdBy &&
    (board.createdBy._id?.toString() || board.createdBy.toString()) === uid
  ) {
    return true;
  }

  // 👥 member check (works populated & non-populated)
  return board.members.some((m) => {
    const memberId =
      m.user?._id?.toString() || m.user?.toString();
    return memberId === uid;
  });
};

module.exports = { isBoardMember };



// const isBoardMember = (board, userId) => {
//   const uid = userId.toString();

//   // creator always allowed
//   if (board.createdBy.toString() === uid) return true;

//   // soft deleted → no access
//   if (board.deletedFor?.map(String).includes(uid)) return false;

//   return board.members.some(
//     (m) => m.user.toString() === uid
//   );
// };

// module.exports = { isBoardMember };

// exports.isBoardMember = (board, userId) => {
//   const uid = userId.toString();

//   if (board.createdBy.toString() === uid) return true;
//   if (board.deletedFor?.map(String).includes(uid)) return false;

//   return board.members.some(m => m.user.toString() === uid);
// };

// exports.isBoardAdmin = (board, userId) => {
//   const uid = userId.toString();

//   if (board.createdBy.toString() === uid) return true;

//   return board.members.some(
//     m => m.user.toString() === uid && m.role === "admin"
//   );
// };

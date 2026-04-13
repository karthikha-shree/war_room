import axios from "./axios";

// Get all boards
export const getBoards = async () => {
  try {
    const response = await axios.get("/boards");
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Create new board
export const createBoard = async (data) => {
  try {
    const response = await axios.post("/boards", { title: data.name });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Get board by ID
export const getBoardById = async (boardId) => {
  try {
    const response = await axios.get(`/boards/${boardId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Add list to board
export const addList = async (boardId, title) => {
  try {
    const response = await axios.post(`/boards/${boardId}/columns`, { title });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Add card to list
export const addCard = async (boardId, listId, text) => {
  try {
    const response = await axios.post(`/boards/${boardId}/columns/${listId}/tasks`, { title: text });
    return response.data;
  } catch (error) {
    console.error("addCard API error:", error);
    console.error("Error response:", error.response);
    throw error.response?.data?.message || error.message || "Something went wrong";
  }
};

// Delete column
export const deleteColumn = async (boardId, columnId) => {
  try {
    const response = await axios.delete(`/boards/${boardId}/columns/${columnId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Update card/task
export const updateCard = async (boardId, listId, cardId, data) => {
  try {
    const response = await axios.put(`/boards/${boardId}/columns/${listId}/tasks/${cardId}`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Delete task/card
export const deleteTask = async (boardId, columnId, taskId) => {
  try {
    const response = await axios.delete(`/boards/${boardId}/columns/${columnId}/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Alias for deleteTask (for consistency with naming)
export const deleteCard = deleteTask;

// Rename board
export const renameBoard = async (boardId, name) => {
  try {
    const response = await axios.put(`/boards/${boardId}`, { title: name });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Archive board (mark as completed)
export const archiveBoard = async (boardId) => {
  try {
    const response = await axios.put(`/boards/${boardId}/complete`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Restore board (change status from completed back to active)
export const restoreBoard = async (boardId) => {
  try {
    const response = await axios.put(`/boards/${boardId}/restore`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Soft delete board (hide from user's view)
export const softDeleteBoard = async (boardId) => {
  try {
    const response = await axios.put(`/boards/${boardId}/soft-delete`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Restore soft deleted board (unhide from user's view)
export const restoreSoftDeletedBoard = async (boardId) => {
  try {
    const response = await axios.put(`/boards/${boardId}/soft-delete/restore`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Delete board (permanently delete - owner only)
export const deleteBoard = async (boardId) => {
  try {
    const response = await axios.delete(`/boards/${boardId}`);
    return response.data;
  } catch (error) {
    console.error("deleteBoard API error:", error.response?.data || error);
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Get boards by status (client-side filtering since backend doesn't support it)
export const getBoardsByStatus = async (status) => {
  try {
    const response = await axios.get(`/boards`);
    // Filter boards by status client-side
    const filteredBoards = response.data.filter(board => {
      if (status === "active") {
        return !board.status || board.status === "active";
      } else if (status === "archived") {
        return board.status === "completed";
      }
      return true;
    });
    return filteredBoards;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Rename column
export const renameColumn = async (boardId, columnId, title) => {
  try {
    const response = await axios.put(`/boards/${boardId}/columns/${columnId}`, { title });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Move task between columns
export const moveTask = async (boardId, sourceColumnId, destinationColumnId, taskId) => {
  try {
    const response = await axios.put(`/boards/${boardId}/tasks/move`, {
      sourceColumnId,
      destinationColumnId,
      taskId
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Reorder tasks within a column
export const reorderTasks = async (boardId, columnId, sourceIndex, destinationIndex) => {
  try {
    const response = await axios.put(`/boards/${boardId}/columns/${columnId}/tasks/reorder`, {
      sourceIndex,
      destinationIndex
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Reorder columns
export const reorderColumns = async (boardId, lists) => {
  try {
    const response = await axios.put(`/boards/${boardId}/reorder-columns`, {
      lists
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Add member to board
export const addMember = async (boardId, email, role) => {
  try {
    const response = await axios.post(`/boards/${boardId}/members`, { email, role });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Get board members
export const getBoardMembers = async (boardId) => {
  try {
    const response = await axios.get(`/boards/${boardId}/members`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Remove member from board
export const removeMember = async (boardId, userId) => {
  try {
    const response = await axios.delete(`/boards/${boardId}/members/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Leave board
export const leaveBoard = async (boardId) => {
  try {
    const response = await axios.put(`/boards/${boardId}/leave`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Change member role
export const changeMemberRole = async (boardId, userId, role) => {
  try {
    const response = await axios.put(`/boards/${boardId}/members/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Cancel invitation
export const cancelInvitation = async (boardId, email) => {
  try {
    const response = await axios.delete(`/boards/${boardId}/invitations`, { data: { email } });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Add comment to a card
export const addComment = async (boardId, columnId, taskId, text) => {
  try {
    const response = await axios.post(`/boards/${boardId}/columns/${columnId}/tasks/${taskId}/comments`, { text });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Edit a comment
export const editComment = async (boardId, columnId, taskId, commentId, text) => {
  try {
    const response = await axios.put(`/boards/${boardId}/columns/${columnId}/tasks/${taskId}/comments/${commentId}`, { text });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Delete a comment
export const deleteComment = async (boardId, columnId, taskId, commentId) => {
  try {
    const response = await axios.delete(`/boards/${boardId}/columns/${columnId}/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Get board activity logs
export const getBoardActivity = async (boardId) => {
  try {
    const response = await axios.get(`/boards/${boardId}/activity`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// Get board chat messages
export const getBoardMessages = async (boardId) => {
  try {
    const response = await axios.get(`/boards/${boardId}/chat`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Something went wrong";
  }
};

// GitHub API functions
export const getBoardGitHub = async (boardId) => {
  const res = await axios.get(`/boards/${boardId}/github`);
  return res.data;
};

export const updateBoardGitHub = async (boardId, githubRepo) => {
  const res = await axios.patch(`/boards/${boardId}/github`, { githubRepo });
  return res.data;
};
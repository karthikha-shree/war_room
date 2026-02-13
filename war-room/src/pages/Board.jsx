import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBoardById, addList, addCard, deleteColumn, deleteTask, updateCard, renameBoard, archiveBoard, renameColumn, moveTask, reorderTasks, reorderColumns, addMember, removeMember, leaveBoard, changeMemberRole } from "../api/boardApi";
import { getCurrentUser } from "../api/authApi";
import { MemberModal, Card, ActivityPanel } from "../components";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { joinBoard, leaveBoard as leaveSocketBoard } from "../socket";

export default function Board() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout, login, token } = useAuth();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add list state
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);

  // Add card state (track which column is adding a card)
  const [addingCardToColumn, setAddingCardToColumn] = useState(null);
  const [newCardText, setNewCardText] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  // Rename board state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [renamingBoard, setRenamingBoard] = useState(false);

  // Rename column state
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editedColumnTitle, setEditedColumnTitle] = useState("");
  const [renamingColumn, setRenamingColumn] = useState(false);

  // Drag and drop state
  const [draggedColumn, setDraggedColumn] = useState(null);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  
  // Member modal state
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  
  // Activity panel state
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);

  // Fetch user data if name is missing
  useEffect(() => {
    if (user && !user.name) {
      getCurrentUser()
        .then((userData) => {
          login(userData, token);
        })
        .catch((err) => {
          console.error("Failed to fetch user data:", err);
        });
    }
  }, [user, token, login]);

  useEffect(() => {
    fetchBoard();
  }, [id]);

  // Join/leave board room for socket events
  useEffect(() => {
    if (board?._id) {
      joinBoard(board._id);
      return () => {
        leaveSocketBoard(board._id);
      };
    }
  }, [board?._id]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getBoardById(id);
      setBoard(data);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to load board");
      console.error("Error fetching board:", err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh board function for MemberModal
  const refreshBoard = async () => {
    try {
      const data = await getBoardById(id);
      setBoard(data);
    } catch (err) {
      console.error("Error refreshing board:", err);
    }
  };

  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    try {
      setAddingList(true);
      setError("");
      const response = await addList(id, newListTitle);
      // Update with full board from response
      setBoard(response.board);
      setNewListTitle("");
      setShowAddList(false);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to add list");
      console.error("Error adding list:", err);
    } finally {
      setAddingList(false);
    }
  };

  const handleAddCard = async (columnId, e) => {
    e.preventDefault();
    if (!newCardText.trim()) return;

    try {
      setAddingCard(true);
      setError("");
      const response = await addCard(id, columnId, newCardText);
      // Update local state instead of refetching
      setBoard(prev => ({
        ...prev,
        columns: prev.columns.map(col => 
          col._id === columnId 
            ? { ...col, tasks: [...col.tasks, response.task] }
            : col
        )
      }));
      setNewCardText("");
      setAddingCardToColumn(null);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to add card");
      console.error("Error adding card:", err);
    } finally {
      setAddingCard(false);
    }
  };

  const handleDeleteColumn = async (columnId) => {
    toast.warning("Are you sure you want to delete this column?", {
      description: "All cards in it will be deleted.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            setError("");
            await deleteColumn(id, columnId);
            setBoard(prev => ({
              ...prev,
              columns: prev.columns.filter(col => col._id !== columnId)
            }));
            toast.success("Column deleted successfully");
          } catch (err) {
            setError(typeof err === "string" ? err : "Failed to delete column");
            toast.error("Failed to delete column");
            console.error("Error deleting column:", err);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
    return;

    try {
      setError("");
      await deleteColumn(id, columnId);
      // Update local state instead of refetching
      setBoard(prev => ({
        ...prev,
        columns: prev.columns.filter(col => col._id !== columnId)
      }));
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to delete column");
      console.error("Error deleting column:", err);
    }
  };

  const handleDeleteTask = async (columnId, taskId) => {
    toast.warning("Are you sure you want to delete this card?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            setError("");
            await deleteTask(id, columnId, taskId);
            setBoard(prev => ({
              ...prev,
              columns: prev.columns.map(col => 
                col._id === columnId
                  ? { ...col, tasks: col.tasks.filter(task => task._id !== taskId) }
                  : col
              )
            }));
            toast.success("Card deleted successfully");
          } catch (err) {
            setError(typeof err === "string" ? err : "Failed to delete card");
            toast.error("Failed to delete card");
            console.error("Error deleting card:", err);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
    return;

    try {
      setError("");
      await deleteTask(id, columnId, taskId);
      // Update local state instead of refetching
      setBoard(prev => ({
        ...prev,
        columns: prev.columns.map(col => 
          col._id === columnId
            ? { ...col, tasks: col.tasks.filter(task => task._id !== taskId) }
            : col
        )
      }));
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to delete card");
      console.error("Error deleting card:", err);
    }
  };

  const handleUpdateCard = async (columnId, taskId, updatedData) => {
    try {
      setError("");
      console.log('Updating card with data:', updatedData);
      const response = await updateCard(id, columnId, taskId, updatedData);
      console.log('Update card response:', response);
      
      // Update local state with the updated task from backend response
      const updatedTask = response.task || response;
      setBoard(prev => ({
        ...prev,
        columns: prev.columns.map(col => 
          col._id === columnId
            ? {
                ...col,
                tasks: col.tasks.map(task => 
                  task._id === taskId ? updatedTask : task
                )
              }
            : col
        )
      }));
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to update card");
      console.error("Error updating card:", err);
      throw err;
    }
  };

  const handleStartEditTitle = () => {
    setEditedTitle(board?.title || "");
    setIsEditingTitle(true);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    if (!editedTitle.trim() || editedTitle === board?.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setRenamingBoard(true);
      setError("");
      await renameBoard(id, editedTitle);
      setBoard({ ...board, title: editedTitle });
      setIsEditingTitle(false);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to rename board");
      console.error("Error renaming board:", err);
    } finally {
      setRenamingBoard(false);
    }
  };

  const handleArchiveBoard = async () => {
    toast.warning("Are you sure you want to archive this board?", {
      description: "You can restore it later.",
      action: {
        label: "Archive",
        onClick: async () => {
          try {
            setError("");
            await archiveBoard(id);
            toast.success("Board archived successfully");
            navigate("/dashboard");
          } catch (err) {
            setError(typeof err === "string" ? err : "Failed to archive board");
            toast.error("Failed to archive board");
            console.error("Error archiving board:", err);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
    return;

    try {
      setError("");
      await archiveBoard(id);
      navigate("/dashboard");
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to archive board");
      console.error("Error archiving board:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Column rename handlers
  const handleStartEditColumn = (columnId, currentTitle) => {
    setEditingColumnId(columnId);
    setEditedColumnTitle(currentTitle);
  };

  const handleCancelEditColumn = () => {
    setEditingColumnId(null);
    setEditedColumnTitle("");
  };

  const handleSaveColumnTitle = async (columnId, e) => {
    e?.preventDefault();
    if (!editedColumnTitle.trim()) {
      setEditingColumnId(null);
      return;
    }

    try {
      setRenamingColumn(true);
      setError("");
      await renameColumn(id, columnId, editedColumnTitle);
      // Update local state instead of refetching
      setBoard(prev => ({
        ...prev,
        columns: prev.columns.map(col => 
          col._id === columnId
            ? { ...col, title: editedColumnTitle }
            : col
        )
      }));
      setEditingColumnId(null);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to rename column");
      console.error("Error renaming column:", err);
    } finally {
      setRenamingColumn(false);
    }
  };

  // Unified Drag and Drop handler for both columns and cards
  const onDragEnd = async (result) => {
    const { source, destination, draggableId, type } = result;

    // Dropped outside a valid droppable
    if (!destination) {
      return;
    }

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Handle COLUMN reordering
    if (type === "COLUMN") {
      const sourceIndex = source.index;
      const destinationIndex = destination.index;

      // Optimistically update UI
      setBoard(prev => {
        const newColumns = Array.from(prev.columns);
        const [removed] = newColumns.splice(sourceIndex, 1);
        newColumns.splice(destinationIndex, 0, removed);
        return { ...prev, columns: newColumns };
      });

      // Persist to backend
      try {
        const lists = board.columns.map((col, index) => ({
          _id: col._id,
          order: index,
        }));
        await reorderColumns(id, lists);
      } catch (err) {
        console.error("Error reordering columns:", err);
        setError("Failed to reorder columns");
        fetchBoard();
      }
      return;
    }

    // Handle CARD drag-and-drop
    const sourceColumnId = source.droppableId;
    const destinationColumnId = destination.droppableId;
    const taskId = draggableId;

    // Optimistically update UI
    setBoard(prev => {
      const sourceColumn = prev.columns.find(col => col._id === sourceColumnId);
      const destinationColumn = prev.columns.find(col => col._id === destinationColumnId);

      if (!sourceColumn || !destinationColumn) return prev;

      // Reordering within same column
      if (sourceColumnId === destinationColumnId) {
        const column = { ...sourceColumn };
        const tasks = Array.from(column.tasks);
        const [removed] = tasks.splice(source.index, 1);
        tasks.splice(destination.index, 0, removed);

        return {
          ...prev,
          columns: prev.columns.map(col =>
            col._id === sourceColumnId ? { ...col, tasks } : col
          )
        };
      }

      // Moving between different columns
      const sourceTasks = Array.from(sourceColumn.tasks);
      const [removed] = sourceTasks.splice(source.index, 1);
      const destinationTasks = Array.from(destinationColumn.tasks);
      destinationTasks.splice(destination.index, 0, removed);

      return {
        ...prev,
        columns: prev.columns.map(col => {
          if (col._id === sourceColumnId) {
            return { ...col, tasks: sourceTasks };
          }
          if (col._id === destinationColumnId) {
            return { ...col, tasks: destinationTasks };
          }
          return col;
        })
      };
    });

    // Persist to backend
    try {
      if (sourceColumnId === destinationColumnId) {
        await reorderTasks(id, sourceColumnId, source.index, destination.index);
      } else {
        await moveTask(id, sourceColumnId, destinationColumnId, taskId);
      }
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to update task position");
      fetchBoard();
    }
  };

  // Add member handlers
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      setAddingMember(true);
      setError("");
      const result = await addMember(id, memberEmail);
      setMemberEmail("");
      setShowAddMember(false);
      // Refresh board data to get updated members list
      const data = await getBoardById(id);
      setBoard(data);
      // Show success message briefly
      setError("");
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to add member");
      console.error("Error adding member:", err);
      // Keep form open so user can try again
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    toast.warning("Remove this member from the board?", {
      action: {
        label: "Remove",
        onClick: async () => {
          try {
            setError("");
            await removeMember(id, userId);
            const data = await getBoardById(id);
            setBoard(data);
            toast.success("Member removed successfully");
          } catch (err) {
            setError(typeof err === "string" ? err : "Failed to remove member");
            toast.error("Failed to remove member");
            console.error("Error removing member:", err);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
    return;

    try {
      setError("");
      await removeMember(id, userId);
      // Refresh board data without showing loading state
      const data = await getBoardById(id);
      setBoard(data);
      // Keep modal open so user can see updated list
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to remove member");
      console.error("Error removing member:", err);
    }
  };

  const handleLeaveBoard = async () => {
    toast.warning("Are you sure you want to leave this board?", {
      description: "You will lose access to it.",
      action: {
        label: "Leave",
        onClick: async () => {
          try {
            setError("");
            await leaveBoard(id);
            toast.success("You have left the board");
            navigate("/dashboard");
          } catch (err) {
            setError(typeof err === "string" ? err : "Failed to leave board");
            toast.error("Failed to leave board");
            console.error("Error leaving board:", err);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
    return;

    try {
      setError("");
      await leaveBoard(id);
      navigate("/dashboard");
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to leave board");
      console.error("Error leaving board:", err);
    }
  };

  const handleChangeMemberRole = async (userId, newRole) => {
    try {
      setError("");
      await changeMemberRole(id, userId, newRole);
      // Refresh board data without showing loading state
      const data = await getBoardById(id);
      setBoard(data);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to change member role");
      console.error("Error changing member role:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-lg font-medium">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${
      activityPanelOpen ? 'mr-80' : ''
    }`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition"
                title="Back to Dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {isEditingTitle ? (
                <form onSubmit={handleSaveTitle} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-2xl font-bold text-gray-800 border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    disabled={renamingBoard}
                  />
                  <button
                    type="submit"
                    disabled={renamingBoard || !editedTitle.trim()}
                    className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {renamingBoard ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditTitle}
                    disabled={renamingBoard}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-2xl font-bold text-gray-800">{board?.title}</h1>
                  {/* Rename button - only for owner and admin */}
                  {(() => {
                    if (!board || !user) return null;
                    const userId = user._id || user.id;
                    const creatorId = board.createdBy?._id || board.createdBy?.id || board.createdBy;
                    const isOwner = String(userId) === String(creatorId);
                    const memberEntry = board.members?.find(m => {
                      const memberId = m.user?._id || m.user?.id || m.user;
                      return String(memberId) === String(userId);
                    });
                    const isAdmin = memberEntry?.role === 'admin';
                    
                    if (isOwner || isAdmin) {
                      return (
                        <button
                          onClick={handleStartEditTitle}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition"
                          title="Rename board"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      );
                    }
                    return null;
                  })()}
                  <button
                    onClick={() => setMemberModalOpen(true)}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition flex items-center gap-2"
                    title="Manage members"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Members
                  </button>
                  <button
                    onClick={() => setActivityPanelOpen(true)}
                    className="ml-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition flex items-center gap-2"
                    title="View activity log"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Activity
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 text-sm font-medium">
                {user?.name || user?.email || 'User'}
              </span>
              {/* Get current user's role */}
              {(() => {
                if (!board || !user) return null;
                const userId = user._id || user.id;
                const creatorId = board.createdBy?._id || board.createdBy?.id || board.createdBy;
                const isOwner = String(userId) === String(creatorId);
                
                // Find user's member entry to get role
                const memberEntry = board.members?.find(m => {
                  const memberId = m.user?._id || m.user?.id || m.user;
                  return String(memberId) === String(userId);
                });
                
                const userRole = memberEntry?.role || (isOwner ? 'owner' : null);
                const isAdmin = userRole === 'admin';
                const isMember = userRole === 'member';
                
                return (
                  <>
                    {/* Show role badge */}
                    {userRole && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        isOwner ? 'bg-purple-100 text-purple-800' : 
                        isAdmin ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {isOwner ? 'Owner' : userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </span>
                    )}
                    
                    {/* Leave Board button for non-owner members */}
                    {!isOwner && memberEntry && (
                      <button
                        onClick={handleLeaveBoard}
                        className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition"
                        title="Leave this board"
                      >
                        Leave Board
                      </button>
                    )}
                    
                    {/* Archive button - only for owner and admin */}
                    {board?.status === "active" && (isOwner || isAdmin) && (
                      <button
                        onClick={handleArchiveBoard}
                        className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition"
                        title="Archive this board"
                      >
                        Archive
                      </button>
                    )}
                  </>
                );
              })()}
              <button
                onClick={() => navigate("/profile")}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                title="View Profile"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-6 mt-4">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-white hover:text-red-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}



      {/* Board Content - Horizontal Scrolling Lists */}
      <div className="p-6 overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 pb-4"
              >
                {/* Render existing columns */}
                {board?.columns?.map((column, columnIndex) => (
                  <Draggable
                    key={column._id}
                    draggableId={column._id}
                    index={columnIndex}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`shrink-0 w-80 ${
                          snapshot.isDragging ? 'opacity-70' : ''
                        }`}
                      >
                        <ColumnContent
                          column={column}
                          columnIndex={columnIndex}
                          boardId={id}
                          editingColumnId={editingColumnId}
                          editedColumnTitle={editedColumnTitle}
                          setEditedColumnTitle={setEditedColumnTitle}
                          renamingColumn={renamingColumn}
                          handleSaveColumnTitle={handleSaveColumnTitle}
                          handleCancelEditColumn={handleCancelEditColumn}
                          handleStartEditColumn={handleStartEditColumn}
                          handleDeleteColumn={handleDeleteColumn}
                          handleDeleteTask={handleDeleteTask}
                          handleUpdateCard={handleUpdateCard}
                          addingCardToColumn={addingCardToColumn}
                          setAddingCardToColumn={setAddingCardToColumn}
                          newCardText={newCardText}
                          setNewCardText={setNewCardText}
                          handleAddCard={handleAddCard}
                          addingCard={addingCard}
                          dragHandleProps={provided.dragHandleProps}
                          boardMembers={board?.members || []}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* Add List Column */}
                <div className="shrink-0 w-80">
                {addingList ? (
                  <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-700 font-medium">Adding list...</span>
                  </div>
                ) : showAddList ? (
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <form onSubmit={handleAddList} className="space-y-3">
                      <input
                        type="text"
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        placeholder="Enter list title..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={!newListTitle.trim()}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add List
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddList(false);
                            setNewListTitle("");
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddList(true)}
                    className="w-full px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition text-left font-medium flex items-center gap-2 shadow-sm border border-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add a list
                  </button>
                )}
              </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      
      {/* Member Modal */}
      {memberModalOpen && (
        <MemberModal
          board={board}
          onClose={() => setMemberModalOpen(false)}
          refreshBoard={refreshBoard}
        />
      )}
      
      {/* Activity Panel */}
      <ActivityPanel
        boardId={id}
        isOpen={activityPanelOpen}
        onClose={() => setActivityPanelOpen(false)}
      />
    </div>
  );
}

// Column content component
function ColumnContent({
  column,
  columnIndex,
  boardId,
  editingColumnId,
  editedColumnTitle,
  setEditedColumnTitle,
  renamingColumn,
  handleSaveColumnTitle,
  handleCancelEditColumn,
  handleStartEditColumn,
  handleDeleteColumn,
  handleDeleteTask,
  handleUpdateCard,
  addingCardToColumn,
  setAddingCardToColumn,
  newCardText,
  setNewCardText,
  handleAddCard,
  addingCard,
  dragHandleProps,
  boardMembers = [],
}) {
  return (
    <>
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200">
        {editingColumnId === column._id ? (
          <form onSubmit={(e) => handleSaveColumnTitle(column._id, e)} className="space-y-2">
            <input
              type="text"
              value={editedColumnTitle}
              onChange={(e) => setEditedColumnTitle(e.target.value)}
              className="w-full px-3 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
              autoFocus
              disabled={renamingColumn}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={renamingColumn || !editedColumnTitle.trim()}
                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {renamingColumn ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEditColumn}
                disabled={renamingColumn}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div {...dragHandleProps} className="flex-1 cursor-move group">
              <h3 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                {column.title}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </h3>
              <span className="text-xs text-gray-500">{column.tasks?.length || 0} cards</span>
            </div>
            <button
              onClick={() => handleStartEditColumn(column._id, column.title)}
              className="text-gray-400 hover:text-blue-500 p-1 rounded hover:bg-gray-200 transition mr-1"
              title="Rename column"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => handleDeleteColumn(column._id)}
              className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-200 transition"
              title="Delete column"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Cards */}
      <Droppable droppableId={column._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-3 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto ${
              snapshot.isDraggingOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''
            }`}
          >
            {column.tasks?.map((task, index) => (
              <Draggable key={task._id} draggableId={task._id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={provided.draggableProps.style}
                  >
                    <Card
                      task={task}
                      columnId={column._id}
                      boardId={boardId}
                      onUpdate={handleUpdateCard}
                      onDelete={handleDeleteTask}
                      isDragging={snapshot.isDragging}
                      boardMembers={boardMembers}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Add Card Form */}
            {addingCardToColumn === column._id && !addingCard ? (
          <form onSubmit={(e) => handleAddCard(column._id, e)} className="space-y-2">
            <textarea
              value={newCardText}
              onChange={(e) => setNewCardText(e.target.value)}
              placeholder="Enter card text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              rows="3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newCardText.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Add Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingCardToColumn(null);
                  setNewCardText("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : addingCard && addingCardToColumn === column._id ? (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 text-sm font-medium">Adding card...</span>
          </div>
        ) : (
          <button
            onClick={() => setAddingCardToColumn(column._id)}
            disabled={addingCard}
            className="w-full px-4 py-3 text-gray-600 hover:bg-gray-200 rounded-lg transition text-left text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add a card
          </button>
        )}
          </div>
        )}
      </Droppable>
      </>
    );
}
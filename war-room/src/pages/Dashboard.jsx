import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBoards, createBoard, getBoardsByStatus, restoreBoard, deleteBoard } from "../api/boardApi";
import { getCurrentUser } from "../api/authApi";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, login, token } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("active");

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
    fetchBoards();
  }, [activeTab]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getBoardsByStatus(activeTab);
      setBoards(data);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to load boards");
      console.error("Error fetching boards:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    try {
      setCreating(true);
      setError("");
      await createBoard({ name: newBoardName });
      setNewBoardName("");
      setShowCreateForm(false);
      await fetchBoards();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to create board");
      console.error("Error creating board:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBoard = async (boardId, e) => {
    e.stopPropagation();
    toast.warning("Restore this board?", {
      description: "It will be moved back to active boards.",
      action: {
        label: "Restore",
        onClick: async () => {
          try {
            setError("");
            await restoreBoard(boardId);
            await fetchBoards();
            toast.success("Board restored successfully");
          } catch (err) {
            setError(typeof err === "string" ? err : "Failed to restore board");
            toast.error("Failed to restore board");
            console.error("Error restoring board:", err);
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
      await restoreBoard(boardId);
      await fetchBoards();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to restore board");
      console.error("Error restoring board:", err);
    }
  };

  const handleDeleteBoard = async (boardId, e) => {
    e.stopPropagation();
    toast.error("Permanently delete this board?", {
      description: "This action cannot be undone!",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            setError("");
            await deleteBoard(boardId);
            await fetchBoards();
            toast.success("Board deleted permanently");
          } catch (err) {
            console.error("Error deleting board:", err);
            const errorMessage = typeof err === "string" ? err : err.message || "Failed to delete board";
            setError(errorMessage);
            toast.error(errorMessage);
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
      await deleteBoard(boardId);
      await fetchBoards();
    } catch (err) {
      console.error("Error deleting board:", err);
      // Show the actual error message from backend
      const errorMessage = typeof err === "string" ? err : err.message || "Failed to delete board";
      setError(errorMessage);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">War Room</h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{user?.name || user?.email || "User"}</span>
              </span>

              <button
                onClick={() => navigate("/profile")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Your Boards</h2>
            <p className="text-gray-600 mt-2">Manage your boards and collaborate with your team</p>
          </div>
          
          {activeTab === "active" && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            >
              {showCreateForm ? "Cancel" : "+ Create Board"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => {
                setActiveTab("active");
                setShowCreateForm(false);
              }}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "active"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Active Boards
            </button>
            <button
              onClick={() => {
                setActiveTab("archived");
                setShowCreateForm(false);
              }}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "archived"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Archived Boards
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Create Board Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Board</h3>
            <form onSubmit={handleCreateBoard} className="flex gap-3">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Enter board name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={creating}
                autoFocus
              />
              <button
                type="submit"
                disabled={creating || !newBoardName.trim()}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading boards...</p>
            </div>
          </div>
        ) : boards.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg shadow-md">
            <svg
              className="w-24 h-24 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {activeTab === "active" ? "No boards yet" : "No archived boards"}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === "active"
                ? "Get started by creating your first board"
                : "Boards you archive will appear here"}
            </p>
            {activeTab === "active" && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Create Your First Board
              </button>
            )}
          </div>
        ) : (
          /* Boards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {boards.map((board) => {
              const userId = user?._id || user?.id;
              const creatorId = board.createdBy?._id || board.createdBy;
              const isOwner = String(userId) === String(creatorId);
              
              // Find user's role in this board
              const memberEntry = board.members?.find(m => {
                const memberId = m.user?._id || m.user?.id || m.user;
                return String(memberId) === String(userId);
              });
              
              const userRole = memberEntry?.role || (isOwner ? 'owner' : null);
              
              return (
              <div
                key={board._id}
                onClick={activeTab === "active" ? () => navigate(`/boards/${board._id}`) : undefined}
                className={`bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-200 relative ${
                  activeTab === "active" ? "cursor-pointer transform hover:-translate-y-1" : ""
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {userRole && (
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      isOwner ? 'text-purple-700 bg-purple-100' : 
                      userRole === 'admin' ? 'text-blue-700 bg-blue-100' : 
                      'text-amber-700 bg-amber-100'
                    }`}>
                      {isOwner ? 'Owner' : userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </span>
                  )}
                  {board.status === "completed" ? (
                    <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded">
                      Archived
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between mb-3 pr-20">
                  <h3 className="text-lg font-semibold text-gray-800 truncate flex-1">
                    {board.title}
                  </h3>
                  {activeTab === "active" && (
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {board.members?.length || 0} members
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      {board.columns?.length || 0} columns
                    </span>
                  </div>
                </div>

                {/* Archived Board Actions */}
                {activeTab === "archived" && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={(e) => handleRestoreBoard(board._id, e)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                    >
                      Restore
                    </button>
                    {isOwner && (
                      <button
                        onClick={(e) => handleDeleteBoard(board._id, e)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                        title="Only owner can permanently delete"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
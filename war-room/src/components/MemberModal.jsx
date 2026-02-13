import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { addMember, changeMemberRole, removeMember, leaveBoard, cancelInvitation } from "../api/boardApi";
import { toast } from "sonner";

const MemberModal = ({ board, onClose, refreshBoard }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Helper to decode JWT token
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // Get user ID - try from user object or decode from token
  const getUserId = () => {
    if (user?._id) return user._id;
    if (user?.id) return user.id;
    if (user?.token) {
      const decoded = decodeToken(user.token);
      return decoded?.id;
    }
    return null;
  };

  const currentUserId = getUserId();

  // Find logged-in user's role in this board  
  const currentUserMember = board?.members?.find(
    (m) => {
      const memberId = m.user?._id || m.user?.id || m.user;
      return String(memberId) === String(currentUserId);
    }
  );
  
  const currentUserRole = currentUserMember?.role;
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const canInvite = isOwner || isAdmin;
  const canChangeRoles = isOwner;

  // Handle invite member
  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const response = await addMember(board._id, email, role);
      
      // Check if it's an invitation (user not registered) or direct add (user exists)
      if (response.details) {
        setSuccess(response.details);
      } else {
        setSuccess("Member added successfully!");
      }
      
      setEmail("");
      setRole("member");
      setTimeout(() => {
        refreshBoard();
        setSuccess("");
      }, 2500);
    } catch (err) {
      setError(err || "Failed to invite member");
    } finally {
      setLoading(false);
    }
  };

  // Handle change role
  const handleChangeRole = async (userId, newRole) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await changeMemberRole(board._id, userId, newRole);
      setSuccess("Role updated successfully!");
      setTimeout(() => {
        refreshBoard();
        setSuccess("");
      }, 1000);
    } catch (err) {
      setError(err || "Failed to change role");
    } finally {
      setLoading(false);
    }
  };

  // Handle remove member
  const handleRemove = async (userId) => {
    toast.warning("Are you sure you want to remove this member?", {
      action: {
        label: "Remove",
        onClick: async () => {
          setError("");
          setSuccess("");
          setLoading(true);
          try {
            await removeMember(board._id, userId);
            setSuccess("Member removed successfully!");
            toast.success("Member removed successfully");
            setTimeout(() => {
              refreshBoard();
              setSuccess("");
            }, 1000);
          } catch (err) {
            setError(err || "Failed to remove member");
            toast.error("Failed to remove member");
          } finally {
            setLoading(false);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
    return;

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await removeMember(board._id, userId);
      setSuccess("Member removed successfully!");
      setTimeout(() => {
        refreshBoard();
        setSuccess("");
      }, 1000);
    } catch (err) {
      setError(err || "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  // Handle leave board
  const handleLeave = async () => {
    toast.warning("Are you sure you want to leave this board?", {
      action: {
        label: "Leave",
        onClick: async () => {
          setError("");
          setLoading(true);
          try {
            await leaveBoard(board._id);
            toast.success("You have left the board");
            window.location.href = "/dashboard";
          } catch (err) {
            setError(err || "Failed to leave board");
            toast.error("Failed to leave board");
            setLoading(false);
          }
        }
      },
      cancel: {
        label: "Cancel"
      }
    });
    return;

    setError("");
    setLoading(true);
    try {
      await leaveBoard(board._id);
      toast.success("You have left the board");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err || "Failed to leave board");
      setLoading(false);
    }
  };

  // Handle cancel invitation
  const handleCancelInvitation = async (email) => {
    toast.warning(`Cancel invitation for ${email}?`, {
      action: {
        label: "Cancel Invite",
        onClick: async () => {
          setError("");
          setSuccess("");
          setLoading(true);
          try {
            await cancelInvitation(board._id, email);
            setSuccess(`Invitation for ${email} cancelled successfully!`);
            toast.success(`Invitation for ${email} cancelled`);
            setTimeout(() => {
              refreshBoard();
              setSuccess("");
            }, 1500);
          } catch (err) {
            setError(err || "Failed to cancel invitation");
            toast.error("Failed to cancel invitation");
          } finally {
            setLoading(false);
          }
        }
      },
      cancel: {
        label: "Keep Invite"
      }
    });
    return;

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await cancelInvitation(board._id, email);
      setSuccess(`Invitation for ${email} cancelled successfully!`);
      setTimeout(() => {
        refreshBoard();
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err || "Failed to cancel invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Board Members</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* DEBUG INFO */}
          <div className="mb-4 p-3 bg-gray-100 rounded-md text-xs">
            <strong>DEBUG:</strong> User ID: {currentUserId || 'N/A'} | 
            Role: {currentUserRole || 'NOT FOUND'} | 
            Owner: {isOwner ? 'YES' : 'NO'} | 
            Admin: {isAdmin ? 'YES' : 'NO'} | 
            Can Invite: {canInvite ? 'YES' : 'NO'}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
              {success}
            </div>
          )}

          {/* Invite Form - Only for Owner/Admin */}
          {canInvite && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Invite Member
              </h3>
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Inviting..." : "Invite"}
                </button>
              </form>
            </div>
          )}

          {/* Member List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Current Members ({board?.members?.length || 0})
            </h3>
            {board?.members?.map((member) => {
              const memberId = member.user?._id || member.user?.id || member.user;
              const isCurrentUser = String(memberId) === String(currentUserId);
              const isMemberOwner = member.role === "owner";

              return (
                <div
                  key={memberId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {member.user.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">
                          {member.user.name}
                          {isCurrentUser && (
                            <span className="text-sm text-gray-500 ml-1">
                              (You)
                            </span>
                          )}
                        </p>
                        {isMemberOwner && (
                          <span className="text-yellow-500" title="Owner">
                            👑
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge or Dropdown */}
                  <div className="flex items-center gap-3">
                    {canChangeRoles && !isMemberOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleChangeRole(memberId, e.target.value)
                        }
                        disabled={loading}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          member.role === "owner"
                            ? "bg-yellow-100 text-yellow-800"
                            : member.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {member.role.charAt(0).toUpperCase() +
                          member.role.slice(1)}
                      </span>
                    )}

                    {/* Remove Button - Only for owner/admin, can't remove owner */}
                    {(isOwner || isAdmin) && !isMemberOwner && !isCurrentUser && (
                      <button
                        onClick={() => handleRemove(memberId)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending Invitations */}
          {board?.invitedMembers && board.invitedMembers.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Pending Invitations ({board.invitedMembers.length})
              </h3>
              {board.invitedMembers.map((invitation, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  {/* Invitation Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center font-semibold">
                      📧
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {invitation.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        Invited {new Date(invitation.invitedAt).toLocaleDateString()} • Will join as {invitation.role}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        invitation.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {invitation.role.charAt(0).toUpperCase() +
                        invitation.role.slice(1)}
                    </span>

                    {/* Cancel Invitation Button - Only for owner/admin */}
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => handleCancelInvitation(invitation.email)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Leave Board Button - Only for non-owners */}
          {currentUserMember && !isOwner && (
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={handleLeave}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Leave Board
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberModal;

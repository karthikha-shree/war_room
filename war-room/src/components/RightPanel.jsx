import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import ActivityPanel from './ActivityPanel';
import GitHubPanel from './GitHubPanel';
import { useAuth } from '../context/AuthContext';
import { addMember, changeMemberRole, removeMember, cancelInvitation } from '../api/boardApi';
import { toast } from 'sonner';

const RightPanel = ({ boardId, board, members, refreshBoard }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const { user } = useAuth();
  
  // Member management state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  // Get pending invitations directly from board prop
  const pendingInvitations = board?.invitedMembers || [];
  
  // Debug log to check if invitations are being received
  if (board?.invitedMembers) {
    console.log('Pending invitations found:', board.invitedMembers);
  }

  // Helper to get current user info
  const getCurrentUserId = () => {
    return user?._id || user?.id;
  };

  const currentUserId = getCurrentUserId();
  const currentUserMember = board?.members?.find(m => {
    const memberId = m.user?._id || m.user?.id || m.user;
    return String(memberId) === String(currentUserId);
  });
  
  const currentUserRole = currentUserMember?.role;
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin';
  const canInvite = isOwner || isAdmin;
  const canChangeRoles = isOwner;

  // Member management handlers
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      const response = await addMember(boardId, email, role);
      if (response.details) {
        toast.success(response.details);
      } else {
        toast.success('Member added successfully!');
      }
      setEmail('');
      setRole('member');
      if (refreshBoard) refreshBoard();
    } catch (err) {
      toast.error(err || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (email) => {
    toast.warning('Cancel this invitation?', {
      action: {
        label: 'Cancel Invitation',
        onClick: async () => {
          setLoading(true);
          try {
            await cancelInvitation(boardId, email);
            toast.success('Invitation cancelled');
            if (refreshBoard) refreshBoard();
          } catch (err) {
            toast.error('Failed to cancel invitation');
          } finally {
            setLoading(false);
          }
        }
      },
      cancel: {
        label: 'Keep Invitation'
      }
    });
  };

  const handleChangeRole = async (userId, newRole) => {
    setLoading(true);
    try {
      await changeMemberRole(boardId, userId, newRole);
      toast.success('Role updated successfully!');
      if (refreshBoard) refreshBoard();
    } catch (err) {
      toast.error(err || 'Failed to change role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    toast.warning('Are you sure you want to remove this member?', {
      action: {
        label: 'Remove',
        onClick: async () => {
          setLoading(true);
          try {
            await removeMember(boardId, userId);
            toast.success('Member removed successfully');
            if (refreshBoard) refreshBoard();
          } catch (err) {
            toast.error('Failed to remove member');
          } finally {
            setLoading(false);
          }
        }
      },
      cancel: {
        label: 'Cancel'
      }
    });
  };

  const tabs = [
    { id: 'chat', label: 'Chat' },
    { id: 'activity', label: 'Activity' },
    { id: 'members', label: 'Members' },
    { id: 'github', label: 'GitHub' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatPanel boardId={boardId} />;
      case 'activity':
        return <ActivityPanel boardId={boardId} />;
      case 'members':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Add Member Form */}
              {canInvite && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Invite Member</h3>
                  <form onSubmit={handleInviteMember} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={loading}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Inviting...' : 'Invite Member'}
                    </button>
                  </form>
                </div>
              )}

              {/* Members List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Board Members ({members?.length || 0})
                </h3>
                {members && members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map((member, index) => {
                      const memberUser = member.user || member;
                      const userName = memberUser?.name || memberUser?.email || 'Unknown User';
                      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      const memberId = memberUser?._id || memberUser?.id;
                      const isCurrentUser = String(memberId) === String(currentUserId);
                      
                      return (
                        <div key={member._id || memberUser._id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {userInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {userName}
                              </p>
                              {isCurrentUser && (
                                <span className="text-xs text-blue-600 font-medium">(You)</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              {canChangeRoles && !isCurrentUser && member.role !== 'owner' ? (
                                <select
                                  value={member.role || 'member'}
                                  onChange={(e) => handleChangeRole(memberId, e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                  disabled={loading}
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                              ) : (
                                <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-200 rounded-md">
                                  {member.role || 'member'}
                                </span>
                              )}
                              
                              {(canChangeRoles && !isCurrentUser && member.role !== 'owner') && (
                                <button
                                  onClick={() => handleRemoveMember(memberId)}
                                  className="text-xs text-red-600 hover:text-red-700 ml-2 px-2 py-1 hover:bg-red-50 rounded-md transition"
                                  disabled={loading}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-gray-500 text-sm font-medium">No members yet</p>
                  </div>
                )}
              </div>

              {/* Pending Invitations - Show for all members, but manage only for owners/admins */}
              {pendingInvitations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Pending Invitations ({pendingInvitations.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingInvitations.map((invitation, index) => {
                      const inviteDate = invitation.invitedAt ? new Date(invitation.invitedAt).toLocaleDateString() : '';
                      
                      return (
                        <div key={invitation.email || index} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            📧
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {invitation.email}
                              </p>
                              <span className="text-xs text-yellow-700 font-medium bg-yellow-200 px-2 py-1 rounded">
                                Pending
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-200 rounded-md">
                                  {invitation.role || 'member'}
                                </span>
                                {inviteDate && (
                                  <span className="text-xs text-gray-500">
                                    Invited {inviteDate}
                                  </span>
                                )}
                              </div>
                              
                              {/* Only owners and admins can cancel invitations */}
                              {canInvite && (
                                <button
                                  onClick={() => handleCancelInvitation(invitation.email)}
                                  className="text-xs text-red-600 hover:text-red-700 ml-2 px-2 py-1 hover:bg-red-50 rounded-md transition"
                                  disabled={loading}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab Header */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-3 text-sm font-medium relative transition-colors duration-200
                ${activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
        {activeTab === "github" && <GitHubPanel boardId={boardId} />}
      </div>
    </div>
  );
};

export default RightPanel;
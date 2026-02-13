import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { addComment, editComment, deleteComment } from '../api/boardApi';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../socket';

const CardComments = ({ boardId, columnId, taskId, card }) => {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize comments from card data
    if (card?.comments) {
      setComments(card.comments);
    }
  }, [card?.comments]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCommentAdded = (data) => {
      if (data.taskId === taskId) {
        setComments(prev => [...prev, data.comment]);
        // Only show toast if it's not the current user's comment
        const commentUserId = data.comment.user?._id || data.comment.user;
        const currentUserId = user?._id || user?.id;
        if (String(commentUserId) !== String(currentUserId)) {
          toast.success('New comment added');
        }
      }
    };

    const handleCommentEdited = (data) => {
      if (data.taskId === taskId) {
        setComments(prev => 
          prev.map(c => 
            c._id === data.comment._id ? { ...c, text: data.comment.text } : c
          )
        );
        // Only show toast if it's not the current user's edit
        const commentUserId = data.comment.user?._id || data.comment.user;
        const currentUserId = user?._id || user?.id;
        if (String(commentUserId) !== String(currentUserId)) {
          toast.success('Comment updated by another user');
        }
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.taskId === taskId) {
        setComments(prev => prev.filter(c => c._id !== data.commentId));
        // Always show delete notifications for clarity
        toast.success('Comment deleted');
      }
    };

    socket.on('comment:added', handleCommentAdded);
    socket.on('comment:edited', handleCommentEdited);
    socket.on('comment:deleted', handleCommentDeleted);

    return () => {
      socket.off('comment:added', handleCommentAdded);
      socket.off('comment:edited', handleCommentEdited);
      socket.off('comment:deleted', handleCommentDeleted);
    };
  }, [taskId, user]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newCommentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setSubmitting(true);
      const data = await addComment(boardId, columnId, taskId, newCommentText);
      setComments(data.comments || []);
      setNewCommentText('');
      // Note: Success toast will be handled by socket event for real-time sync
    } catch (error) {
      toast.error(error || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editingText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      const data = await editComment(boardId, columnId, taskId, commentId, editingText);
      setComments(prevComments => 
        prevComments.map(c => 
          c._id === commentId ? { ...c, text: data.comment.text } : c
        )
      );
      setEditingCommentId(null);
      setEditingText('');
      // Note: Success toast will be handled by socket event for real-time sync
    } catch (error) {
      toast.error(error || 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    toast.warning('Delete this comment?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteComment(boardId, columnId, taskId, commentId);
            setComments(prevComments => prevComments.filter(c => c._id !== commentId));
            // Note: Success toast will be handled by socket event for real-time sync
          } catch (error) {
            toast.error(error || 'Failed to delete comment');
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  const startEditing = (comment) => {
    setEditingCommentId(comment._id);
    setEditingText(comment.text);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : '?';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const isCommentOwner = (comment) => {
    const commentUserId = comment.user?._id || comment.user;
    const currentUserId = user?._id || user?.id;
    return String(commentUserId) === String(currentUserId);
  };

  return (
    <div className="space-y-4">
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Comments
          {comments.length > 0 && (
            <span className="text-xs text-gray-500 font-normal">({comments.length})</span>
          )}
        </h3>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {comments.map((comment) => {
            const commentUser = comment.user;
            const userName = commentUser?.name || commentUser?.email || 'Unknown User';
            const userEmail = commentUser?.email || '';
            const initials = getInitials(userName, userEmail);
            const isOwner = isCommentOwner(comment);

            return (
              <div key={comment._id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                <div className="flex gap-3">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{userName}</span>
                        <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      {isOwner && editingCommentId !== comment._id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(comment)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition"
                            title="Edit comment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition"
                            title="Delete comment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Comment Text or Edit Form */}
                    {editingCommentId === comment._id ? (
                      <div className="mt-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
                          rows={3}
                          disabled={submitting}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditComment(comment._id)}
                            disabled={submitting}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={submitting}
                            className="px-3 py-1 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="space-y-3">
        <div className="relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
            rows={3}
            disabled={submitting}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !newCommentText.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CardComments;

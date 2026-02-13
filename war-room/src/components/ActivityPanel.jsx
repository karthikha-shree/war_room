import { useState, useEffect } from 'react';
import { getBoardActivity } from '../api/boardApi';
import { getSocket } from '../socket';

const ActivityPanel = ({ boardId, isOpen, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (boardId && isOpen) {
      fetchActivities();
    }
  }, [boardId, isOpen]);

  // Socket listeners for real-time activity updates
  useEffect(() => {
    if (!isOpen) return;
    
    const socket = getSocket();
    if (!socket) return;

    const handleNewActivity = (activityData) => {
      if (activityData.boardId === boardId) {
        setActivities(prev => [activityData.activity, ...prev]);
      }
    };

    socket.on('activity:new', handleNewActivity);

    return () => {
      socket.off('activity:new', handleNewActivity);
    };
  }, [boardId, isOpen]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getBoardActivity(boardId);
      setActivities(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to load activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (action, meta = {}) => {
    const actionMap = {
      // Task actions
      TASK_CREATED: `created task "${meta.taskTitle || 'Untitled'}"`,
      TASK_UPDATED: `updated task "${meta.taskTitle || 'Untitled'}"`,
      TASK_DELETED: `deleted task "${meta.taskTitle || 'Untitled'}"`,
      TASK_MOVED: `moved task "${meta.taskTitle || 'Untitled'}" to "${meta.destinationColumn || 'column'}"`,
      TASK_ASSIGNED: `assigned task "${meta.taskTitle || 'Untitled'}"`,

      // Comment actions  
      COMMENT_ADDED: `added a comment`,
      COMMENT_EDITED: 'edited a comment',
      COMMENT_DELETED: `deleted a comment`,

      // Column actions
      COLUMN_CREATED: `created column "${meta.columnTitle || 'Untitled'}"`,
      COLUMN_RENAMED: `renamed column to "${meta.newTitle || meta.title || 'Untitled'}"`,
      COLUMN_DELETED: `deleted column "${meta.columnTitle || 'Untitled'}"`,
      COLUMN_REORDERED: `reordered columns`,

      // Member actions
      MEMBER_ADDED: `added ${meta.memberEmail || 'a member'} to the board`,
      MEMBER_REMOVED: `removed ${meta.memberEmail || 'a member'} from the board`,
      MEMBER_LEFT: `left the board`,
      MEMBER_ROLE_CHANGED: `changed ${meta.memberEmail || 'member'}'s role to ${meta.newRole || 'member'}`,

      // Board actions
      BOARD_CREATED: `created the board`,
      BOARD_UPDATED: `updated board settings`,
      BOARD_COMPLETED: `archived the board`,
      BOARD_RESTORED: `restored the board`,
    };

    return actionMap[action] || `performed ${action.toLowerCase().replace(/_/g, ' ')}`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getActionIcon = (action) => {
    if (action.includes('TASK')) {
      return (
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h5.586a1 1 0 00.707-.293l5.414-5.414a1 1 0 00.293-.707V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      );
    }
    
    if (action.includes('COMMENT')) {
      return (
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      );
    }
    
    if (action.includes('COLUMN')) {
      return (
        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
      );
    }

    if (action.includes('MEMBER')) {
      return (
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      );
    }

    // Default icon for board actions
    return (
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const name = user.name || user.email || '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Activity Log
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
          aria-label="Close activity panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading activities...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 mb-2">Failed to load activities</p>
              <button
                onClick={fetchActivities}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Try again
              </button>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-500">No activities yet</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {activities.map((activity, index) => {
                const user = activity.user;
                const userName = user?.name || user?.email || 'Unknown user';
                const userInitials = getUserInitials(user);
                
                return (
                  <div key={activity._id || index} className="flex gap-3">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {userInitials}
                      </div>
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        {/* Action Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getActionIcon(activity.action)}
                        </div>

                        {/* Activity Details */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{userName}</span>
                            <span className="text-gray-700 ml-1">
                              {formatAction(activity.action, activity.meta)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimestamp(activity.createdAt)}
                          </p>
                        </div>
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
};

export default ActivityPanel;
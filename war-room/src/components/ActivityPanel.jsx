import React, { useState, useEffect } from 'react';
import { getBoardActivity } from '../api/boardApi';
import { toast } from 'sonner';

const ActivityPanel = ({ boardId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!boardId) return;

      try {
        setLoading(true);
        const activityLogs = await getBoardActivity(boardId);
        // Reverse chronological order (newest first)
        const sortedActivities = activityLogs?.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ) || [];
        setActivities(sortedActivities);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        toast.error('Failed to load board activity');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [boardId]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getUserName = (activity) => {
    return activity.user?.name || activity.user?.email || 'Unknown User';
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm font-medium">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-sm font-medium">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="divide-y divide-gray-100">
          {activities.map((activity, index) => (
            <div key={activity._id || `activity-${index}`} className="py-4 hover:bg-gray-50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {getUserName(activity)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {formatAction(activity.action, activity.meta)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {activity.type || 'activity'}
                  </span>
                  <time className="text-xs text-gray-500 font-medium">
                    {formatTimestamp(activity.createdAt)}
                  </time>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityPanel;
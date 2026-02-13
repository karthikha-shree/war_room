import { useState } from 'react';
import { CardModal } from './index';

const Card = ({
  task,
  columnId,
  boardId,
  onUpdate,
  onDelete,
  isDragging = false,
  boardMembers = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (e) => {
    // Prevent opening modal when dragging
    if (isDragging) return;
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'svg' && e.target.tagName !== 'path') {
      setIsModalOpen(true);
    }
  };

  const handleSave = async (updatedCardData) => {
    try {
      await onUpdate(columnId, task._id, updatedCardData);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const handleDelete = async (cardId) => {
    try {
      await onDelete(columnId, cardId);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(columnId, task._id);
  };

  const getDescriptionPreview = () => {
    if (!task.description) return null;
    const preview = task.description.length > 100 
      ? `${task.description.substring(0, 100)}...` 
      : task.description;
    return preview;
  };

  const getAssignedMembersDisplay = () => {
    if (!task.assignedMembers || task.assignedMembers.length === 0) return null;
    
    // Debug logging to see the data structure
    console.log('Task assigned members:', task.assignedMembers);
    console.log('Board members:', boardMembers);
    
    return task.assignedMembers.slice(0, 3).map(member => {
      // Handle both populated (user object) and unpopulated (ID string) scenarios
      let memberData = null;
      let memberId = null;
      
      if (typeof member === 'string') {
        // Member is just an ID, find in boardMembers
        memberId = member;
        const memberEntry = boardMembers.find(m => {
          const mId = m.user?._id || m.user?.id || m.user;
          return String(mId) === String(memberId);
        });
        
        if (memberEntry) {
          memberData = memberEntry.user;
        }
      } else if (member && typeof member === 'object') {
        // Member is already a populated user object from backend
        memberId = member._id || member.id;
        memberData = member;
      }
      
      if (!memberData) {
        console.log('No member data found for:', member);
        return null;
      }
      
      const name = memberData.name || memberData.email || '?';
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      
      return { memberId, initials, name };
    }).filter(Boolean);
  };

  const assignedMembersDisplay = getAssignedMembersDisplay();
  const remainingCount = (task.assignedMembers?.length || 0) - 3;

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition group cursor-pointer ${
          isDragging ? 'opacity-50 rotate-2 scale-105' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-gray-800 text-sm font-medium">{task.title}</p>
              {task.description && (
                <svg 
                  className="w-3.5 h-3.5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  title="Has description"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h7" 
                  />
                </svg>
              )}
            </div>
            {task.description && (
              <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                {getDescriptionPreview()}
              </p>
            )}
            
            {/* Assigned Members */}
            {assignedMembersDisplay && assignedMembersDisplay.length > 0 && (
              <div className="flex items-center gap-1 mt-3">
                {assignedMembersDisplay.map(({ memberId, initials, name }) => (
                  <div
                    key={memberId}
                    className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm"
                    title={name}
                  >
                    {initials}
                  </div>
                ))}
                {remainingCount > 0 && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-semibold shadow-sm">
                    +{remainingCount}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleDeleteClick}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
            title="Delete card"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        card={task}
        onSave={handleSave}
        onDelete={handleDelete}
        boardMembers={boardMembers}
        boardId={boardId}
        columnId={columnId}
      />
    </>
  );
};

export default Card;
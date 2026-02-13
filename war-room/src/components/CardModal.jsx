import { useState, useEffect, useRef } from 'react';
import CardComments from './CardComments';

const CardModal = ({ isOpen, onClose, card, onSave, onDelete, boardMembers = [], boardId, columnId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      
      // Debug logging for card data
      console.log('Card data in CardModal:', card);
      console.log('Original assignedMembers:', card.assignedMembers);
      
      // Handle assignedMembers - normalize to array of IDs
      const normalizedAssignedMembers = (card.assignedMembers || []).map(member => {
        if (typeof member === 'string') {
          return member; // Already an ID
        } else if (member && typeof member === 'object') {
          return member._id || member.id; // Extract ID from populated object
        }
        return null;
      }).filter(Boolean);
      
      console.log('Normalized assignedMembers:', normalizedAssignedMembers);
      setAssignedMembers(normalizedAssignedMembers);
    }
  }, [card]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMemberDropdown(false);
      }
    };

    if (showMemberDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown]);

  const handleSave = () => {
    // Debug logging for save data
    console.log('Saving card with data:', {
      title,
      description,
      assignedMembers,
    });
    
    // Only send updatable fields to the backend
    onSave({
      title,
      description,
      assignedMembers,
    });
  };

  const toggleMemberAssignment = (memberId) => {
    setAssignedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const removeMember = (memberId) => {
    setAssignedMembers(prev => prev.filter(id => id !== memberId));
  };

  const getMemberDetails = (memberId) => {
    return validBoardMembers.find(m => {
      const mId = m.user?._id || m.user?.id || m.user;
      return String(mId) === String(memberId);
    });
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : '?';
  };

  const getDisplayName = (member) => {
    const userObj = member?.user;
    return userObj?.name || userObj?.email || 'Unknown';
  };

  const handleDelete = () => {
    onDelete(card._id);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Ensure boardMembers is a valid array
  const validBoardMembers = Array.isArray(boardMembers) ? boardMembers : [];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Edit Card</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="card-title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Title
              </label>
              <input
                id="card-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter card title"
              />
            </div>

            <div>
              <label
                htmlFor="card-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="card-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Enter card description"
              />
            </div>

            {/* Assign Members Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Members
              </label>
              
              {/* Selected Members */}
              {assignedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {assignedMembers.map(memberId => {
                    const memberEntry = getMemberDetails(memberId);
                    if (!memberEntry) return null;
                    const userObj = memberEntry.user;
                    const displayName = userObj?.name || userObj?.email || 'Unknown';
                    const initials = getInitials(userObj?.name, userObj?.email);
                    
                    return (
                      <div
                        key={memberId}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                          {initials}
                        </div>
                        <span>{displayName}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(memberId)}
                          className="ml-1 text-blue-500 hover:text-blue-700 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Member Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {assignedMembers.length === 0 ? 'Select members' : `${assignedMembers.length} member(s) assigned`}
                  </span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMemberDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {validBoardMembers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No members available
                      </div>
                    ) : (
                      <div className="py-1">
                        {validBoardMembers.map(memberEntry => {
                          const userObj = memberEntry.user;
                          const memberId = userObj?._id || userObj?.id || userObj;
                          const isAssigned = assignedMembers.includes(String(memberId));
                          const displayName = getDisplayName(memberEntry);
                          const initials = getInitials(userObj?.name, userObj?.email);
                          const role = memberEntry.role;
                          
                          return (
                            <button
                              key={memberId}
                              type="button"
                              onClick={() => toggleMemberAssignment(String(memberId))}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                                  {initials}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{displayName}</div>
                                  <div className="text-xs text-gray-500 capitalize">{role}</div>
                                </div>
                              </div>
                              {isAssigned && (
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            {boardId && columnId && card?._id && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <CardComments 
                  boardId={boardId}
                  columnId={columnId}
                  taskId={card._id}
                  card={card}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            Delete Card
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardModal;

/**
 * Example usage of FolderDialog component
 * 
 * This file demonstrates how to integrate the FolderDialog component
 * with the useChatFolders hook for creating and editing folders.
 */

import React, { useState } from 'react';
import { FolderDialog } from './FolderDialog';
import { useChatFolders } from '../hooks/useChatFolders';
import { ChatFolder } from '../types/chatOrganization';

export function FolderDialogExample() {
  const { createFolder, updateFolder } = useChatFolders();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | undefined>(undefined);

  // Handler for creating a new folder
  const handleCreateFolder = () => {
    setEditingFolder(undefined);
    setDialogOpen(true);
  };

  // Handler for editing an existing folder
  const handleEditFolder = (folder: ChatFolder) => {
    setEditingFolder(folder);
    setDialogOpen(true);
  };

  // Handler for saving folder (create or update)
  const handleSaveFolder = async (name: string, icon?: string, color?: string) => {
    if (editingFolder) {
      // Update existing folder
      await updateFolder(editingFolder.id, { name, icon, color });
    } else {
      // Create new folder
      await createFolder(name, icon, color);
    }
  };

  return (
    <div>
      {/* Button to open dialog for creating new folder */}
      <button onClick={handleCreateFolder}>
        Создать папку
      </button>

      {/* Button to open dialog for editing folder (example) */}
      <button onClick={() => handleEditFolder({
        id: 'example-id',
        user_id: 'user-id',
        name: 'Работа',
        icon: '💼',
        color: '#00f2ff',
        order_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })}>
        Редактировать папку
      </button>

      {/* FolderDialog component */}
      <FolderDialog
        open={dialogOpen}
        folder={editingFolder}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveFolder}
      />
    </div>
  );
}

/**
 * Integration with FolderPanel:
 * 
 * The FolderPanel component can be refactored to use FolderDialog
 * instead of the inline form. Here's how:
 * 
 * 1. Import FolderDialog:
 *    import { FolderDialog } from './FolderDialog';
 * 
 * 2. Replace the inline form state with dialog state:
 *    const [dialogOpen, setDialogOpen] = useState(false);
 *    const [editingFolder, setEditingFolder] = useState<ChatFolder | undefined>(undefined);
 * 
 * 3. Replace the "+" button onClick handler:
 *    onClick={() => {
 *      setEditingFolder(undefined);
 *      setDialogOpen(true);
 *    }}
 * 
 * 4. Replace the edit button onClick handler:
 *    onClick={(e) => {
 *      e.stopPropagation();
 *      setEditingFolder(folder);
 *      setDialogOpen(true);
 *    }}
 * 
 * 5. Create a unified save handler:
 *    const handleSaveFolder = async (name: string, icon?: string, color?: string) => {
 *      if (editingFolder) {
 *        await updateFolder(editingFolder.id, { name, icon, color });
 *      } else {
 *        await createFolder(name, icon, color);
 *      }
 *    };
 * 
 * 6. Replace the inline form section with:
 *    <FolderDialog
 *      open={dialogOpen}
 *      folder={editingFolder}
 *      onClose={() => setDialogOpen(false)}
 *      onSave={handleSaveFolder}
 *    />
 * 
 * This approach:
 * - Separates concerns (dialog UI vs panel UI)
 * - Makes the dialog reusable in other contexts
 * - Improves code maintainability
 * - Provides better UX with modal overlay
 * - Follows the design patterns from the spec
 */

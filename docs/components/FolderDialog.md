# FolderDialog Component

## Overview

The `FolderDialog` component is a modal dialog for creating and editing chat folders. It provides a user-friendly interface with Russian localization for managing folder properties including name, icon, and color.

## Features

- **Create/Edit Mode**: Supports both creating new folders and editing existing ones
- **Validation**: Real-time validation with Russian error messages
- **Icon Selection**: 10 predefined emoji icons to choose from
- **Color Selection**: 8 predefined colors for folder customization
- **Keyboard Support**: Enter to save, Escape to cancel
- **Mobile-Friendly**: Touch-optimized with 44px minimum touch targets
- **Accessibility**: Proper labels and ARIA attributes
- **Loading States**: Disabled state during save operations
- **Russian Localization**: All UI text and error messages in Russian

## Props

```typescript
interface FolderDialogProps {
  open: boolean;              // Controls dialog visibility
  folder?: ChatFolder;        // Optional folder to edit (undefined for create mode)
  onClose: () => void;        // Called when dialog should close
  onSave: (name: string, icon?: string, color?: string) => Promise<void>; // Save handler
}
```

## Usage

### Creating a New Folder

```typescript
import { FolderDialog } from './FolderDialog';
import { useChatFolders } from '../hooks/useChatFolders';

function MyComponent() {
  const { createFolder } = useChatFolders();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSave = async (name: string, icon?: string, color?: string) => {
    await createFolder(name, icon, color);
  };

  return (
    <>
      <button onClick={() => setDialogOpen(true)}>Создать папку</button>
      <FolderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
```

### Editing an Existing Folder

```typescript
import { FolderDialog } from './FolderDialog';
import { useChatFolders } from '../hooks/useChatFolders';
import { ChatFolder } from '../types/chatOrganization';

function MyComponent() {
  const { updateFolder } = useChatFolders();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | undefined>();

  const handleEdit = (folder: ChatFolder) => {
    setEditingFolder(folder);
    setDialogOpen(true);
  };

  const handleSave = async (name: string, icon?: string, color?: string) => {
    if (editingFolder) {
      await updateFolder(editingFolder.id, { name, icon, color });
    }
  };

  return (
    <>
      <button onClick={() => handleEdit(someFolder)}>Редактировать</button>
      <FolderDialog
        open={dialogOpen}
        folder={editingFolder}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
```

### Unified Create/Edit Handler

```typescript
const handleSaveFolder = async (name: string, icon?: string, color?: string) => {
  if (editingFolder) {
    // Edit mode
    await updateFolder(editingFolder.id, { name, icon, color });
  } else {
    // Create mode
    await createFolder(name, icon, color);
  }
};

<FolderDialog
  open={dialogOpen}
  folder={editingFolder}
  onClose={() => setDialogOpen(false)}
  onSave={handleSaveFolder}
/>
```

## Validation

The component validates folder names according to the requirements:

- **Empty Name**: "Имя папки не может быть пустым"
- **Too Long**: "Имя папки не может превышать 50 символов" (max 50 characters)
- Character counter shows current length: "X/50"

## Available Icons

The component provides 10 predefined emoji icons:

📁 💼 🏠 ⭐ ❤️ 🎮 📚 🎵 🎨 ⚡

## Available Colors

The component provides 8 predefined colors:

- `#00f2ff` - Cyan (default)
- `#ff0080` - Pink
- `#00ff00` - Green
- `#ffaa00` - Orange
- `#8b5cf6` - Purple
- `#ef4444` - Red
- `#3b82f6` - Blue
- `#f59e0b` - Amber

## Keyboard Shortcuts

- **Enter**: Save folder (when name is valid)
- **Escape**: Cancel and close dialog

## Mobile Optimization

- Minimum touch target size: 44px × 44px
- Touch-friendly spacing and padding
- Responsive layout adapts to screen size
- Tap highlight color removed for better UX
- Smooth animations and transitions

## Accessibility

- Proper label elements for inputs
- ARIA labels for color buttons
- Focus management (auto-focus on name input)
- Keyboard navigation support
- Clear visual feedback for selected items

## Error Handling

The component displays errors in a prominent red banner at the top of the dialog content. Errors are cleared when:
- Dialog is opened/reopened
- User starts typing (validation errors)
- Save operation succeeds

## Integration with Requirements

This component satisfies the following requirements from the spec:

- **Requirement 1.1**: Allow users to create folders with name, icon, and color
- **Requirement 1.2**: Allow users to edit folder name, icon, and color
- **Requirement 12.1**: Display all folder UI elements in Russian

## Design Patterns

The component follows the established design patterns from the FolderPanel component:

- Dark theme with `#1a1a1a` background
- Cyan accent color (`#00f2ff`)
- Consistent spacing and border radius
- Hover and active states for interactive elements
- Error styling with red color (`#ef4444`)
- Touch-friendly minimum sizes (44px)

## Future Enhancements

Potential improvements for future iterations:

1. Custom icon picker (emoji picker integration)
2. Custom color picker (hex input or color wheel)
3. Folder name suggestions based on chat content
4. Drag-and-drop icon upload
5. Folder templates (Work, Personal, etc.)
6. Undo/redo support
7. Duplicate folder detection

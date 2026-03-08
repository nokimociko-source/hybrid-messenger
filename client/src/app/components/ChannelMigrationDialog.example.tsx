import { logger } from '../utils/logger';
import React, { useState } from 'react';
import { ChannelMigrationDialog } from './ChannelMigrationDialog';

/**
 * Example usage of ChannelMigrationDialog component
 * 
 * This component is used to convert a group chat into a broadcast channel.
 * Only the group creator can perform this action.
 */

export function ChannelMigrationDialogExample() {
  const [showDialog, setShowDialog] = useState(false);

  const handleSuccess = () => {
    logger.info('Migration successful!');
    // In a real app, you would:
    // 1. Refresh the room data
    // 2. Show a success notification
    // 3. Update the UI to reflect channel status
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Channel Migration Dialog Example</h2>
      
      <button
        onClick={() => setShowDialog(true)}
        style={{
          padding: '12px 24px',
          background: '#00f2ff',
          border: 'none',
          borderRadius: '8px',
          color: '#000',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        Convert Group to Channel
      </button>

      {showDialog && (
        <ChannelMigrationDialog
          roomId="example-room-id"
          roomName="My Awesome Group"
          memberCount={156}
          onClose={() => setShowDialog(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

/**
 * Integration Example
 * 
 * Here's how you would integrate this dialog into a group settings page:
 */

export function GroupSettingsWithMigration() {
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  
  // Mock data - in real app, this would come from props or hooks
  const room = {
    id: 'room-123',
    name: 'Tech Discussion',
    type: 'community' as const,
    member_count: 42,
    created_at: '2024-01-01T00:00:00Z',
  };

  const userRole = 'creator'; // Only creators can migrate

  const handleMigrationSuccess = () => {
    logger.info('Group successfully converted to channel');
    // Refresh room data, show notification, etc.
    setShowMigrationDialog(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Group Settings</h2>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Advanced Options</h3>
        
        {userRole === 'creator' && room.type === 'community' && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(0, 242, 255, 0.1)',
              border: '1px solid rgba(0, 242, 255, 0.3)',
              borderRadius: '8px',
              marginTop: '12px',
            }}
          >
            <h4 style={{ margin: '0 0 8px 0', color: '#00f2ff' }}>
              Convert to Broadcast Channel
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#ccc' }}>
              Transform this group into a broadcast channel where only admins can post messages.
              This action cannot be undone.
            </p>
            <button
              onClick={() => setShowMigrationDialog(true)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 77, 77, 0.2)',
                border: '1px solid rgba(255, 77, 77, 0.5)',
                borderRadius: '8px',
                color: '#ff4d4d',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Convert to Channel
            </button>
          </div>
        )}
      </div>

      {showMigrationDialog && (
        <ChannelMigrationDialog
          roomId={room.id}
          roomName={room.name}
          memberCount={room.member_count || 0}
          onClose={() => setShowMigrationDialog(false)}
          onSuccess={handleMigrationSuccess}
        />
      )}
    </div>
  );
}

/**
 * Usage Notes:
 * 
 * 1. Permission Check:
 *    - Only show the migration option to group creators
 *    - The RPC function will also verify permissions server-side
 * 
 * 2. Prerequisites:
 *    - The migrate_group_to_channel RPC function must be deployed
 *    - User must be authenticated
 *    - Room must be of type 'community' (not already a channel)
 * 
 * 3. After Migration:
 *    - Room type changes from 'community' to 'channel'
 *    - Regular members lose posting permissions
 *    - Admins retain all permissions
 *    - All message history is preserved
 *    - Subscriber count remains the same
 * 
 * 4. Error Handling:
 *    - The dialog displays error messages inline
 *    - Common errors:
 *      - "Only creator can migrate to channel" - User is not the creator
 *      - "User not authenticated" - Session expired
 *      - Database errors - Network or permission issues
 * 
 * 5. UI/UX Considerations:
 *    - Warning is prominently displayed
 *    - Action is clearly labeled as irreversible
 *    - Member count is shown to emphasize impact
 *    - Confirmation required (no accidental clicks)
 */

export default ChannelMigrationDialogExample;

/**
 * Example usage of ChannelDiscovery component
 * 
 * This file demonstrates various use cases and integration patterns for the ChannelDiscovery component.
 */

import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Button, Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import FocusTrap from 'focus-trap-react';
import { ChannelDiscovery } from './ChannelDiscovery';

// Example 1: Standalone usage
export function StandaloneExample() {
  return (
    <BrowserRouter>
      <div style={{ height: '100vh', padding: '24px' }}>
        <h1>Standalone Channel Discovery</h1>
        <p>The component takes up the full available space.</p>
        <ChannelDiscovery />
      </div>
    </BrowserRouter>
  );
}

// Example 2: In a modal dialog
export function ModalExample() {
  const [showDiscovery, setShowDiscovery] = useState(false);

  return (
    <BrowserRouter>
      <div style={{ padding: '24px' }}>
        <h1>Channel Discovery in Modal</h1>
        <p>Click the button to open the discovery interface in a modal.</p>
        
        <Button onClick={() => setShowDiscovery(true)}>
          Discover Channels
        </Button>

        {showDiscovery && (
          <Overlay open={showDiscovery} backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setShowDiscovery(false),
                  clickOutsideDeactivates: true,
                }}
              >
                <Modal
                  style={{ 
                    width: '90vw', 
                    maxWidth: '900px', 
                    height: '80vh',
                    maxHeight: '800px',
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%' 
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px',
                      borderBottom: '1px solid var(--bg-surface-border)',
                    }}>
                      <h2 style={{ margin: 0 }}>Discover Channels</h2>
                      <Button 
                        variant="Secondary" 
                        onClick={() => setShowDiscovery(false)}
                      >
                        Close
                      </Button>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <ChannelDiscovery />
                    </div>
                  </div>
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
      </div>
    </BrowserRouter>
  );
}

// Example 3: In a sidebar panel
export function SidebarExample() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Main content */}
        <div style={{ flex: 1, padding: '24px' }}>
          <h1>Main Content Area</h1>
          <p>Click the button to open the discovery panel.</p>
          
          <Button onClick={() => setShowPanel(true)}>
            Open Discovery Panel
          </Button>
        </div>

        {/* Sidebar panel */}
        {showPanel && (
          <div style={{
            width: '400px',
            borderLeft: '1px solid var(--bg-surface-border)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--bg-surface-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ margin: 0 }}>Channels</h2>
              <Button 
                variant="Secondary" 
                size="300"
                onClick={() => setShowPanel(false)}
              >
                Close
              </Button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChannelDiscovery />
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}

// Example 4: In a tab view
export function TabViewExample() {
  const [activeTab, setActiveTab] = useState<'chats' | 'channels'>('chats');

  return (
    <BrowserRouter>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Tab navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '16px',
          borderBottom: '1px solid var(--bg-surface-border)',
        }}>
          <Button
            variant={activeTab === 'chats' ? 'Primary' : 'Secondary'}
            onClick={() => setActiveTab('chats')}
          >
            Chats
          </Button>
          <Button
            variant={activeTab === 'channels' ? 'Primary' : 'Secondary'}
            onClick={() => setActiveTab('channels')}
          >
            Discover Channels
          </Button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'chats' ? (
            <div style={{ padding: '24px' }}>
              <h2>Your Chats</h2>
              <p>Chat list would appear here...</p>
            </div>
          ) : (
            <ChannelDiscovery />
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

// Example 5: With custom header
export function CustomHeaderExample() {
  return (
    <BrowserRouter>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Custom header */}
        <div style={{
          padding: '24px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--bg-surface-border)',
        }}>
          <h1 style={{ margin: '0 0 8px 0' }}>Explore Channels</h1>
          <p style={{ margin: 0, color: 'var(--tc-surface-normal)' }}>
            Find interesting channels to subscribe to and stay updated with the latest content.
          </p>
        </div>

        {/* Discovery component */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChannelDiscovery />
        </div>
      </div>
    </BrowserRouter>
  );
}

// Example 6: Responsive mobile view
export function MobileExample() {
  return (
    <BrowserRouter>
      <div style={{
        height: '100vh',
        maxWidth: '480px',
        margin: '0 auto',
        border: '1px solid var(--bg-surface-border)',
      }}>
        <ChannelDiscovery />
      </div>
    </BrowserRouter>
  );
}

// Main example component showing all variations
export function ChannelDiscoveryExamples() {
  const [currentExample, setCurrentExample] = useState<string>('standalone');

  const examples = {
    standalone: { component: StandaloneExample, title: 'Standalone' },
    modal: { component: ModalExample, title: 'Modal Dialog' },
    sidebar: { component: SidebarExample, title: 'Sidebar Panel' },
    tabs: { component: TabViewExample, title: 'Tab View' },
    custom: { component: CustomHeaderExample, title: 'Custom Header' },
    mobile: { component: MobileExample, title: 'Mobile View' },
  };

  const CurrentExample = examples[currentExample as keyof typeof examples].component;

  return (
    <div>
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--bg-surface-border)',
      }}>
        <h1 style={{ margin: '0 0 16px 0' }}>ChannelDiscovery Examples</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(examples).map(([key, { title }]) => (
            <Button
              key={key}
              variant={currentExample === key ? 'Primary' : 'Secondary'}
              size="300"
              onClick={() => setCurrentExample(key)}
            >
              {title}
            </Button>
          ))}
        </div>
      </div>
      <CurrentExample />
    </div>
  );
}

export default ChannelDiscoveryExamples;

import { toast } from 'sonner';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { DashboardContent } from 'src/layouts/dashboard';

import { useMockedUser } from 'src/auth/hooks';

import { BlockList } from './block-list';
import { BLOCK_TEMPLATES } from './types';
import { BuilderChatInput } from './builder-chat-input';
import { BuilderChatMessages } from './builder-chat-messages';

// ----------------------------------------------------------------------

// Mock Builder AI responses (v0.1 - hardcoded flow)
const getMockResponse = (userMessage, blocks) => {
  const msg = userMessage.toLowerCase();

  // First message - ask about business
  if (blocks.length === 0 && msg.includes('restaurant')) {
    return {
      content:
        "Great! An Italian restaurant. I'll help you set up an AI agent for customer service. Can you share your menu with me? You can drag a PDF file here or just tell me about your main dishes.",
      createBlocks: null,
    };
  }

  // Menu uploaded or described
  if (msg.includes('menu') || msg.includes('pasta') || msg.includes('pizza')) {
    return {
      content:
        "Perfect! I've created a knowledge block with your menu information. Now, how would you like your AI to communicate with customers? Should it be friendly and casual, or more formal and professional?",
      createBlocks: [
        {
          id: Date.now(),
          ...BLOCK_TEMPLATES.knowledge_menu,
          content: 'Pasta: $12, Pizza: $15, Salad: $8, Tiramisu: $7',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
  }

  // Personality choice
  if (msg.includes('friendly') || msg.includes('casual')) {
    return {
      content:
        "Excellent! I've set the tone to friendly and casual with moderate emoji usage. Would you like your agent to handle reservations? I can integrate with Google Calendar if you'd like.",
      createBlocks: [
        {
          id: Date.now(),
          ...BLOCK_TEMPLATES.personality_friendly,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
  }

  // Reservation action
  if (msg.includes('reservation') || msg.includes('calendar') || msg.includes('yes')) {
    return {
      content:
        "Perfect! I've added a reservation action block. Your AI can now help customers book tables. You can test your agent or add more capabilities like hours & location information.",
      createBlocks: [
        {
          id: Date.now(),
          ...BLOCK_TEMPLATES.action_reservation,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
  }

  // Default response
  return {
    content:
      "I understand. Could you tell me more about that? Or if you're ready, you can test your agent configuration!",
    createBlocks: null,
  };
};

// ----------------------------------------------------------------------

export function BuilderView() {
  const { user } = useMockedUser();

  const [blocks, setBlocks] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: '1',
      body: "Hi! I'm Builder AI. Tell me about your business and I'll help you create an AI agent.",
      contentType: 'text',
      createdAt: new Date().toISOString(),
      senderId: 'builder-ai',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = Chat, 1 = Configure
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Mock participants for chat UI
  const participants = useMemo(() => [
    {
      id: 'builder-ai',
      name: 'Builder AI',
      avatarUrl: null,
      role: 'assistant',
    },
    {
      id: `${user?.id}`,
      name: user?.displayName || 'You',
      avatarUrl: user?.photoURL,
      role: 'user',
    },
  ], [user]);

  // Send message handler (websocket-style stub)
  const handleSendMessage = (messageBody) => {
    if (!messageBody.trim()) return;

    // Add user message immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      body: messageBody,
      contentType: 'text',
      createdAt: new Date().toISOString(),
      senderId: `${user?.id}`,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Show typing indicator
    setIsTyping(true);

    // Simulate websocket response delay
    setTimeout(() => {
      // Get mock response
      const response = getMockResponse(messageBody, blocks);

      // Add AI response
      const aiMessage = {
        id: `ai-${Date.now()}`,
        body: response.content,
        contentType: 'text',
        createdAt: new Date().toISOString(),
        senderId: 'builder-ai',
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Create blocks if suggested
      if (response.createBlocks) {
        setBlocks((prev) => [...prev, ...response.createBlocks]);
        toast.success(`✓ Created ${response.createBlocks.length} new block(s)`);
      }

      setIsTyping(false);
    }, 1500);
  };

  // File upload handler (websocket-style stub)
  const handleFileUpload = (file) => {
    toast.success(`File "${file.name}" uploaded! Processing...`);

    // Show typing indicator
    setIsTyping(true);

    // Simulate websocket processing delay
    setTimeout(() => {
      // Add AI response
      const aiMessage = {
        id: `ai-file-${Date.now()}`,
        body: `Great! I've processed "${file.name}". I found your menu with 45 items. I'll create a knowledge block for this.`,
        contentType: 'text',
        createdAt: new Date().toISOString(),
        senderId: 'builder-ai',
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Create knowledge block
      const newBlock = {
        id: Date.now() + 1,
        ...BLOCK_TEMPLATES.knowledge_menu,
        file_path: file.name,
        content: `Extracted from ${file.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setBlocks((prev) => [...prev, newBlock]);
      toast.success('✓ Created knowledge block from uploaded file');

      setIsTyping(false);
    }, 2000);
  };

  // Block handlers
  const handleBlockClick = (block) => {
    setSelectedBlock(block);
    setActiveTab(1); // Switch to Configure tab
  };

  const handleDeleteBlock = (blockId) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    toast.success('Block deleted');
  };

  const handleAddBlock = (type) => {
    const template = Object.values(BLOCK_TEMPLATES).find((t) => t.block_type === type);
    if (template) {
      const newBlock = {
        id: Date.now(),
        ...template,
        name: `New ${type}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setBlocks((prev) => [...prev, newBlock]);
      toast.success('Block added! Click to edit.');
    }
  };

  const handleReorderBlocks = (reorderedBlocks) => {
    setBlocks(reorderedBlocks);
  };

  return (
    <DashboardContent
      maxWidth={false}
      sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column' }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '400px 1fr' },
          gap: 3,
          minHeight: 0,
          flex: '1 1 0',
        }}
      >
        {/* Left: Block List */}
        <BlockList
          blocks={blocks}
          onBlockClick={handleBlockClick}
          onDeleteBlock={handleDeleteBlock}
          onAddBlock={handleAddBlock}
          onReorderBlocks={handleReorderBlocks}
        />

        {/* Right: Tabbed Content Area */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: (theme) => theme.customShadows.z8,
          }}
        >
          {/* Tabs Header */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              px: 2,
              borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
            }}
          >
            <Tab label="Chat with Builder AI" />
            <Tab label={selectedBlock ? `Configure: ${selectedBlock.name}` : 'Configure Block'} disabled={!selectedBlock} />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {activeTab === 0 && (
              <>
                <BuilderChatMessages messages={messages} participants={participants} isTyping={isTyping} />
                <BuilderChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} disabled={false} />
              </>
            )}
            {activeTab === 1 && selectedBlock && (
              <Box sx={{ p: 3 }}>
                {/* Placeholder for block configuration form */}
                <Box>Configure block: {selectedBlock.name}</Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}

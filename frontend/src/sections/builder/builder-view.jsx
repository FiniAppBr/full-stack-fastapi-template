import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { alpha } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { useMockedUser } from 'src/auth/hooks';

import { Iconify } from 'src/components/iconify';

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
  const [messages, setMessages] = useState([]);
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
        // Auto-select the first created block and switch to Configure tab
        if (response.createBlocks.length > 0) {
          setSelectedBlock(response.createBlocks[0]);
          setActiveTab(1);
          toast.success(`✓ Created ${response.createBlocks.length} new block(s) - Configure it now!`);
        }
      }

      setIsTyping(false);
    }, 1500);
  };

  // File upload handler with progressive single message
  const handleFileUpload = (file) => {
    const fileExt = file.name.split('.').pop().toLowerCase();
    const progressMessageId = `progressive-${Date.now()}`;

    // Add progressive message with initial state embedded
    const progressMsg = {
      id: progressMessageId,
      body: '',
      contentType: 'progressive',
      createdAt: new Date().toISOString(),
      senderId: 'builder-ai',
      progressData: { fileName: file.name, stage: 'uploading', progress: 0 },
    };
    setMessages((prev) => [...prev, progressMsg]);

    // Stage 1: Uploading (0-25%)
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === progressMessageId
            ? { ...msg, progressData: { ...msg.progressData, progress: 25 } }
            : msg
        )
      );

      // Stage 2: Analyzing (25-50%)
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === progressMessageId
              ? { ...msg, progressData: { ...msg.progressData, stage: 'analyzing', progress: 50 } }
              : msg
          )
        );

        // Stage 3: Processing (50-75%)
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === progressMessageId
                ? { ...msg, progressData: { ...msg.progressData, stage: 'processing', progress: 75 } }
                : msg
            )
          );

          // Stage 4: Creating (75-100%)
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === progressMessageId
                  ? { ...msg, progressData: { ...msg.progressData, stage: 'creating', progress: 100 } }
                  : msg
              )
            );

            // Create the block
            const newBlock = {
              id: Date.now() + 1,
              ...BLOCK_TEMPLATES.knowledge_menu,
              name: file.name,
              file_path: file.name,
              file_type: fileExt,
              content: `Content extracted from ${file.name}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setBlocks((prev) => [...prev, newBlock]);

            // Stage 5: Complete
            setTimeout(() => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === progressMessageId
                    ? {
                        ...msg,
                        progressData: {
                          ...msg.progressData,
                          stage: 'complete',
                          blockId: newBlock.id,
                          blockName: newBlock.name,
                        },
                      }
                    : msg
                )
              );
              toast.success(`✓ Knowledge block "${file.name}" created!`);
            }, 400);
          }, 800);
        }, 800);
      }, 800);
    }, 600);
  };

  // Block handlers
  const handleBlockClick = (block) => {
    setSelectedBlock(block);
    setActiveTab(1); // Switch to Configure tab
  };

  const handleConfigureBlock = (blockId) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      setSelectedBlock(block);
      setActiveTab(1);
    }
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
      setSelectedBlock(newBlock);
      setActiveTab(1); // Switch to Configure tab
      toast.success('Block added! Configure it now.');
    }
  };

  const handleReorderBlocks = (reorderedBlocks) => {
    setBlocks(reorderedBlocks);
  };

  const handleResetChat = () => {
    setMessages([]);
    setIsTyping(false);
    setActiveTab(0); // Switch back to chat tab
    toast.success('Chat reset');
  };

  // Drag-and-drop for entire chat area
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Don't trigger on click, only on drop
    noKeyboard: true,
  });

  return (
    <DashboardContent
      maxWidth={false}
      sx={{
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        minHeight: 0,
        height: 0,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '400px 1fr' },
          gap: 3,
          flex: '1 1 auto',
          minHeight: 0,
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

        {/* Right: Tabbed Content Area with Drag-and-Drop */}
        <Box
          {...getRootProps()}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: (theme) => theme.customShadows.z8,
            position: 'relative',
          }}
        >
          <input {...getInputProps()} />

          {/* Drag Overlay */}
          {isDragActive && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                border: (theme) => `2px dashed ${theme.palette.primary.main}`,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
                pointerEvents: 'none',
              }}
            >
              <Iconify icon="eva:cloud-upload-fill" width={64} sx={{ color: 'primary.main' }} />
              <Typography variant="h6" color="primary.main">
                Drop file here to upload
              </Typography>
            </Box>
          )}

          {/* Tabs Header */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              px: 2,
              borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
            }}
          >
            <Tab
              icon={<Iconify icon="solar:chat-round-dots-bold" width={20} />}
              iconPosition="start"
              label="Chat"
              sx={{ minWidth: 100 }}
            />
            <Tab
              icon={<Iconify icon="solar:settings-bold" width={20} />}
              iconPosition="start"
              label="Configure"
              disabled={!selectedBlock}
              sx={{ minWidth: 100 }}
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}>
            {/* Chat Tab */}
            <Box
              sx={{
                display: activeTab === 0 ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                overflow: 'hidden',
              }}
            >
              {/* Reset Chat Button - Top Left */}
              {messages.length > 0 && (
                <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                  <IconButton
                    size="small"
                    onClick={handleResetChat}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: (theme) => theme.customShadows.z8,
                      '&:hover': {
                        bgcolor: 'background.paper',
                        boxShadow: (theme) => theme.customShadows.z16,
                      },
                    }}
                  >
                    <Iconify icon="solar:restart-bold" width={18} />
                  </IconButton>
                </Box>
              )}

              <BuilderChatMessages
                messages={messages}
                participants={participants}
                isTyping={isTyping}
                onStarterPromptClick={handleSendMessage}
                onConfigureBlock={handleConfigureBlock}
              />
              <BuilderChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} disabled={false} />
            </Box>

            {/* Configure Tab */}
            <Box
              sx={{
                display: activeTab === 1 ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                overflow: 'hidden',
                p: 3,
              }}
            >
              {selectedBlock && (
                <Box>Configure block: {selectedBlock.name}</Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}

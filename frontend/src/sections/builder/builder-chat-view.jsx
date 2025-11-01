import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BuilderChatInput } from './builder-chat-input';
import { BuilderChatMessages } from './builder-chat-messages';
import { AgentTestChat } from './agent-test-chat';

// ----------------------------------------------------------------------

export function BuilderChatView({
  messages,
  participants,
  isTyping,
  onSendMessage,
  onFileUpload,
  onStarterPromptClick,
  onConfigureBlock,
  onConfirmAction,
  onResetChat,
  activeTab,
  onTabChange,
  selectedBlock,
  getRootProps,
  getInputProps,
  isDragActive,
}) {
  return (
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
        height: '100%',
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
            bgcolor: 'background.paper',
            border: (theme) => `4px dashed ${theme.palette.primary.main}`,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            pointerEvents: 'none',
          }}
        >
          <Iconify icon="eva:cloud-upload-fill" width={80} sx={{ color: 'primary.main' }} />
          <Typography variant="h4" color="primary.main">
            Drop file here to upload
          </Typography>
        </Box>
      )}

      {/* Tabs Header */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => onTabChange(newValue)}
        sx={{
          px: 2,
          borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        <Tab
          icon={<Iconify icon="solar:magic-stick-3-bold" width={20} />}
          iconPosition="start"
          label="Gerente"
          sx={{ minWidth: 100 }}
        />
        <Tab
          icon={<Iconify icon="solar:settings-bold" width={20} />}
          iconPosition="start"
          label="Configure"
          disabled={!selectedBlock}
          sx={{ minWidth: 100 }}
        />
        <Tab
          icon={<Iconify icon="solar:chat-line-bold" width={20} />}
          iconPosition="start"
          label="Teste"
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
                onClick={onResetChat}
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
            onStarterPromptClick={onStarterPromptClick}
            onConfigureBlock={onConfigureBlock}
            onConfirmAction={onConfirmAction}
          />
          <BuilderChatInput onSendMessage={onSendMessage} onFileUpload={onFileUpload} disabled={false} />
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

        {/* Teste Tab */}
        <Box
          sx={{
            display: activeTab === 2 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <AgentTestChat />
        </Box>
      </Box>
    </Box>
  );
}

BuilderChatView.propTypes = {
  messages: PropTypes.array,
  participants: PropTypes.array,
  isTyping: PropTypes.bool,
  onSendMessage: PropTypes.func,
  onFileUpload: PropTypes.func,
  onStarterPromptClick: PropTypes.func,
  onConfigureBlock: PropTypes.func,
  onConfirmAction: PropTypes.func,
  onResetChat: PropTypes.func,
  activeTab: PropTypes.number,
  onTabChange: PropTypes.func,
  selectedBlock: PropTypes.object,
  getRootProps: PropTypes.func,
  getInputProps: PropTypes.func,
  isDragActive: PropTypes.bool,
};

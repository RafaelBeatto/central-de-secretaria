import { useState } from 'react';
import { Divider, Box } from '@mui/material';
import AppCard from 'src/components/shared/AppCard';
import ChatSidebar from './ChatSidebar';
import ChatContent from './ChatContent';
import ChatMsgSent from './ChatMsgSent';

/** Chat completo da tela inicial (mesma composição da tela de chat do template). */
const ChatPainel = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AppCard>
      <ChatSidebar isMobileSidebarOpen={isMobileSidebarOpen} onSidebarClose={() => setMobileSidebarOpen(false)} />
      <Box flexGrow={1} minWidth={0}>
        <ChatContent toggleChatSidebar={() => setMobileSidebarOpen(true)} />
        <Divider />
        <ChatMsgSent />
      </Box>
    </AppCard>
  );
};

export default ChatPainel;

import { Drawer, Theme, useMediaQuery } from '@mui/material';
import ChatListing from './ChatListing';

interface Props {
  isMobileSidebarOpen: boolean;
  onSidebarClose: () => void;
}

const drawerWidth = 320;

/** Lista de conversas: fixa no computador, gaveta no celular (igual ao template). */
const ChatSidebar = ({ isMobileSidebarOpen, onSidebarClose }: Props) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  return (
    <Drawer
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant={lgUp ? 'permanent' : 'temporary'}
      sx={{
        width: lgUp ? drawerWidth : 'auto',
        flexShrink: 0,
        zIndex: lgUp ? 0 : 1300,
        [`& .MuiDrawer-paper`]: { position: lgUp ? 'relative' : 'fixed', width: { xs: '85vw', sm: drawerWidth } },
      }}
    >
      <ChatListing aoSelecionar={onSidebarClose} />
    </Drawer>
  );
};

export default ChatSidebar;

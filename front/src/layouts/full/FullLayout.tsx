import { FC } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'src/store/Store';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import { useChatTempoReal } from 'src/hooks/useChatTempoReal';
import { useAvisoAgenda } from 'src/hooks/useAvisoAgenda';

const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(() => ({
  display: 'flex',
  flexGrow: 1,
  paddingBottom: '60px',
  flexDirection: 'column',
  zIndex: 1,
  width: '100%',
  minWidth: 0,
  backgroundColor: 'transparent',
}));

const FullLayout: FC = () => {
  const customizer = useSelector((state) => state.customizer);
  const theme = useTheme();
  // Mantém o chat conectado em qualquer tela (contador de não lidas no cabeçalho).
  useChatTempoReal();
  // Aviso 30 min antes dos eventos de hoje, em qualquer tela.
  useAvisoAgenda();

  return (
    <MainWrapper className={customizer.activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}>
      <Sidebar />
      <PageWrapper
        className="page-wrapper"
        sx={{
          ...(customizer.isCollapse && {
            [theme.breakpoints.up('lg')]: { ml: `${customizer.MiniSidebarWidth}px` },
          }),
        }}
      >
        <Header />
        <Container sx={{ pt: { xs: 2, md: '30px' }, px: { xs: 2, md: 3 }, maxWidth: '100%!important' }}>
          <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
            <Outlet />
          </Box>
        </Container>
      </PageWrapper>
    </MainWrapper>
  );
};

export default FullLayout;

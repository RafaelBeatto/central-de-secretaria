import { IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack, Tooltip, Theme } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { toggleSidebar, toggleMobileSidebar, setDarkMode } from 'src/store/customizer/CustomizerSlice';
import { IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';
import BuscaGeral from './BuscaGeral';
import Profile from './Profile';
import SeletorUnidade from './SeletorUnidade';
import AvisoChat from './AvisoChat';

const Header = () => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const customizer = useSelector((state) => state.customizer);
  const dispatch = useDispatch();

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: customizer.TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
    gap: theme.spacing(1),
  }));

  const escuro = customizer.activeMode === 'dark';

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <IconButton
          color="inherit"
          aria-label="Abrir ou recolher o menu"
          onClick={lgUp ? () => dispatch(toggleSidebar()) : () => dispatch(toggleMobileSidebar())}
        >
          <IconMenu2 size="20" />
        </IconButton>

        <SeletorUnidade />
        <BuscaGeral />

        <Box flexGrow={1} />
        <Stack spacing={{ xs: 0, sm: 1 }} direction="row" alignItems="center">
          <AvisoChat />
          <Tooltip title={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}>
            <IconButton
              size="large"
              color="inherit"
              aria-label="Alternar tema"
              onClick={() => dispatch(setDarkMode(escuro ? 'light' : 'dark'))}
            >
              {escuro ? <IconSun size="21" stroke="1.5" /> : <IconMoon size="21" stroke="1.5" />}
            </IconButton>
          </Tooltip>
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;

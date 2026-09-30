import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery, Theme } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { closeMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import { usePermissao } from 'src/hooks/usePermissao';
import { montarMenu } from './MenuItems';
import NavItem from './NavItem';
import NavGroup from './NavGroup/NavGroup';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const customizer = useSelector((state) => state.customizer);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';
  const dispatch = useDispatch();
  const { tem } = usePermissao();
  const menu = useMemo(() => montarMenu((m) => !m.permissao || tem(m.permissao)), [tem]);
  // Qualquer subpágina (ex.: /projetos/12) mantém o item do menu selecionado.
  const ativo = menu.find((item) => item.href && pathname.startsWith(item.href))?.href ?? pathname;

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {menu.map((item) =>
          item.subheader ? (
            <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />
          ) : (
            <NavItem
              item={item}
              key={item.id}
              pathDirect={ativo}
              hideMenu={hideMenu}
              onClick={() => dispatch(closeMobileSidebar())}
            />
          ),
        )}
      </List>
    </Box>
  );
};
export default SidebarItems;

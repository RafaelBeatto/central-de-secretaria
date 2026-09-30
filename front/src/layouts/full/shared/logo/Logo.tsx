import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Box, styled, Typography } from '@mui/material';
import { useSelector } from 'src/store/Store';
import logoApae from 'src/assets/images/logos/logo-apae.png';

/** Logo da APAE + nome do sistema (só o logo com o menu recolhido). */
const Logo: FC = () => {
  const customizer = useSelector((state) => state.customizer);
  const recolhido = customizer.isCollapse && !customizer.isSidebarHover;
  const LinkStyled = styled(Link)(() => ({
    height: customizer.TopbarHeight,
    width: recolhido ? '40px' : '220px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  }));

  return (
    <LinkStyled to="/painel">
      <Box component="img" src={logoApae} alt="APAE" sx={{ width: 40, height: 40, objectFit: 'contain' }} />
      {recolhido ? null : (
        <Typography variant="h6" color="textPrimary" noWrap>
          Central da Secretaria
        </Typography>
      )}
    </LinkStyled>
  );
};

export default Logo;

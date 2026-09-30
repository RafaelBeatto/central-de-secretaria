import { ReactNode } from 'react';
import { Grid, Box, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import imagemFundo from 'src/assets/images/backgrounds/login-bg.svg';
import Logo from 'src/layouts/full/shared/logo/Logo';

/** Moldura das telas de entrar e trocar senha (a mesma do Login do template). */
const LayoutAutenticacao = ({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) => (
  <PageContainer title={`${titulo} · Central da Secretaria`} description={subtitulo}>
    <Grid container spacing={0} sx={{ overflowX: 'hidden', minHeight: '100vh' }}>
      <Grid
        item
        xs={12}
        lg={7}
        xl={8}
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: '0.3',
          },
        }}
      >
        <Box position="relative">
          <Box px={3}>
            <Logo />
          </Box>
          <Box
            alignItems="center"
            justifyContent="center"
            height="calc(100vh - 75px)"
            sx={{ display: { xs: 'none', lg: 'flex' } }}
          >
            <img src={imagemFundo} alt="" style={{ width: '100%', maxWidth: '500px' }} />
          </Box>
        </Box>
      </Grid>
      <Grid item xs={12} lg={5} xl={4} display="flex" justifyContent="center" alignItems="center">
        <Box p={{ xs: 3, sm: 4 }} width="100%" maxWidth={460}>
          <Typography fontWeight="700" variant="h3" mb={1}>
            {titulo}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" mb={1}>
            {subtitulo}
          </Typography>
          {children}
        </Box>
      </Grid>
    </Grid>
  </PageContainer>
);

export default LayoutAutenticacao;

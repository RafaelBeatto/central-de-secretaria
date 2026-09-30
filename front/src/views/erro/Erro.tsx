import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import imagemErro from 'src/assets/images/backgrounds/errorimg.svg';

const TEXTOS = {
  403: { titulo: 'Acesso negado', texto: 'Seu cargo não tem permissão para abrir esta tela.' },
  404: { titulo: 'Página não encontrada', texto: 'O endereço acessado não existe.' },
};

/** Página de erro do template, em português. */
const Erro = ({ codigo }: { codigo: 403 | 404 }) => (
  <Box display="flex" flexDirection="column" height="calc(100vh - 170px)" textAlign="center" justifyContent="center">
    <Container maxWidth="md">
      <img src={imagemErro} alt="" style={{ width: '100%', maxWidth: '400px' }} />
      <Typography align="center" variant="h1" mb={2}>
        {TEXTOS[codigo].titulo}
      </Typography>
      <Typography align="center" variant="h5" mb={4}>
        {TEXTOS[codigo].texto}
      </Typography>
      <Button color="primary" variant="contained" component={Link} to="/painel">
        Voltar ao painel
      </Button>
    </Container>
  </Box>
);

export default Erro;

import { useEffect, useRef } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Pagina from 'src/components/container/Pagina';
import ChatPainel from 'src/components/apps/chats/ChatPainel';
import { useSelector } from 'src/store/Store';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';

function saudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

/**
 * Tela inicial. Nesta fase: saudação e o chat com os colegas da unidade.
 * "Para resolver", "Hoje/7 dias" e o andamento dos projetos entram com os módulos.
 */
const Painel = () => {
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const { tem } = usePermissao();
  const { hash } = useLocation();
  const blocoChat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hash === '#chat') blocoChat.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <Pagina>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4">
            {saudacao()}, {usuario?.nome}!
          </Typography>
          <Typography color="textSecondary">
            {usuario?.cargo.nome} · {usuario?.unidade.nome}
          </Typography>
        </Grid>
        {tem(PERMISSOES.CHAT_USAR) ? (
          <Grid item xs={12}>
            <Box ref={blocoChat} id="chat" sx={{ scrollMarginTop: 90 }}>
              <Typography variant="h5" mb={2}>
                Conversas
              </Typography>
              <ChatPainel />
            </Box>
          </Grid>
        ) : null}
      </Grid>
    </Pagina>
  );
};

export default Painel;

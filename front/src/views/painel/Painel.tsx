import { useEffect, useMemo, useRef } from 'react';
import { Alert, Box, ButtonBase, CardContent, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Pagina from 'src/components/container/Pagina';
import BlankCard from 'src/components/shared/BlankCard';
import ChatPainel from 'src/components/apps/chats/ChatPainel';
import SecoesPendencias from 'src/components/apps/pendencias/SecoesPendencias';
import { HojeEProximos, Numeros, Projetos } from 'src/components/apps/painel/BlocosPainel';
import { useSelector } from 'src/store/Store';
import { useDadosPainel } from 'src/hooks/useDadosPainel';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { dataCompleta, hojeIso } from 'src/utils/datas';
import { montarPendencias, porCategoria } from 'src/utils/pendencias';

function saudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

const plural = (n: number, singular: string, pl: string) => `${n} ${n === 1 ? singular : pl}`;

/**
 * Tela inicial: o que resolver agora (com a ação ali mesmo), hoje e próximos 7 dias,
 * andamento dos projetos, três números da semana e o chat com os colegas da unidade.
 */
const Painel = () => {
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const { tem } = usePermissao();
  const navegar = useNavigate();
  const { hash } = useLocation();
  const blocoChat = useRef<HTMLDivElement>(null);
  const { dados, carregando, erro, recarregar } = useDadosPainel();

  useEffect(() => {
    if (hash === '#chat') blocoChat.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  const pendencias = useMemo(() => (dados ? montarPendencias(dados) : []), [dados]);
  const grupos = porCategoria(pendencias);
  const nAtrasado = grupos.atrasado.length;
  const nAtencao = grupos.atencao.length;
  const hoje = hojeIso();
  const nHoje = dados ? dados.agenda.filter((i) => i.data === hoje && i.origem !== 'DOCUMENTO' && !i.concluido).length : 0;

  const resumo =
    !nAtrasado && !nAtencao
      ? `Tudo em dia${nHoje ? `, e ${plural(nHoje, 'coisa', 'coisas')} na agenda de hoje` : ''}.`
      : [nAtrasado && plural(nAtrasado, 'atrasado', 'atrasados'), nAtencao && `${nAtencao} pedindo atenção`, nHoje && `${nHoje} na agenda de hoje`]
          .filter(Boolean)
          .join(' · ');

  return (
    <Pagina>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4">
            {saudacao()}, {usuario?.nome}!
          </Typography>
          <Typography color="textSecondary" sx={{ textTransform: 'capitalize' }}>
            {dataCompleta(hoje)}
          </Typography>
          <Typography color="textSecondary">
            {usuario?.cargo.nome} · {usuario?.unidade.nome}
            {dados ? ` · ${resumo}` : ''}
          </Typography>
        </Grid>

        {erro ? (
          <Grid item xs={12}>
            <Alert severity="error">{erro}</Alert>
          </Grid>
        ) : null}
        {carregando && !dados ? (
          <Grid item xs={12}>
            <LinearProgress />
          </Grid>
        ) : null}

        {dados ? (
          <>
            <Grid item xs={12} lg={7}>
              <BlankCard>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">Para resolver</Typography>
                    <ButtonBase onClick={() => navegar('/pendencias')} sx={{ color: 'primary.main', typography: 'body2' }}>
                      Todas as pendências →
                    </ButtonBase>
                  </Stack>
                  {nAtrasado || nAtencao ? (
                    <SecoesPendencias pendencias={pendencias} categorias={['atrasado', 'atencao']} limite={6} maxAtendimentos={2} aoMudar={recarregar} />
                  ) : (
                    <Alert severity="success">
                      <strong>Nada atrasado.</strong> Nenhuma tarefa, documento, atendimento ou projeto esperando por você.
                    </Alert>
                  )}
                </CardContent>
              </BlankCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <HojeEProximos dados={dados} />
            </Grid>
            {dados.recursos.length ? (
              <Grid item xs={12}>
                <Projetos recursos={dados.recursos} />
              </Grid>
            ) : null}
            <Grid item xs={12}>
              <Numeros dados={dados} />
            </Grid>
          </>
        ) : null}

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

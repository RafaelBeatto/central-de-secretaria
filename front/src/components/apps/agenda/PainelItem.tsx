import { ReactNode } from 'react';
import { Link as LinkRouter } from 'react-router-dom';
import { Box, Button, Chip, Grid, LinearProgress, Link, Stack, Typography } from '@mui/material';
import { IconArrowLeft, IconArrowRight, IconCalendarEvent, IconCheck, IconEdit, IconRotate, IconTrash } from '@tabler/icons-react';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import { servicoAgenda } from 'src/servicos/agenda';
import { COR_PRIORIDADE, ROTULO_FREQUENCIA, ROTULO_PRIORIDADE } from 'src/types/comum';
import { EventoDetalhe, ItemAgenda, ROTULO_TIPO_EVENTO } from 'src/types/agenda';
import type { Tarefa } from 'src/types/tarefas';
import { horario } from 'src/utils/agenda';
import { dataCompleta } from 'src/utils/datas';
import { formatarData } from 'src/utils/formatacao';
import { rotinaFutura } from 'src/utils/tarefas';
import { COR_ORIGEM } from './cores';

const Fato = ({ rotulo, largo, children }: { rotulo: string; largo?: boolean; children: ReactNode }) => (
  <Grid item xs={12} sm={largo ? 12 : 6}>
    <Typography variant="caption" color="textSecondary" display="block">
      {rotulo}
    </Typography>
    <Box sx={{ overflowWrap: 'anywhere' }}>{children}</Box>
  </Grid>
);

interface Props {
  item: ItemAgenda;
  /** Carregado ao abrir um evento (série, tarefa ligada). */
  evento: EventoDetalhe | null;
  /** Carregada ao abrir uma tarefa (para concluir com as regras da rotina). */
  tarefa: Tarefa | null;
  podeAlterarEvento: boolean;
  podeAlterarTarefa: boolean;
  verTarefas: boolean;
  aoVoltar: () => void;
  aoConcluir: () => void;
  aoReabrir: () => void;
  aoEditar: () => void;
  aoMover: () => void;
  aoExcluir: () => void;
}

/** Painel com o item aberto: evento (ações, repetição e tarefa ligada), tarefa ou prazo de outro módulo. */
const PainelItem = (p: Props) => {
  const { item: i, evento, tarefa } = p;
  const cor = COR_ORIGEM[i.origem === 'DOCUMENTO' || i.origem === 'PROJETO' ? 'PRAZO' : i.origem];
  const voltar = (
    <Button color="inherit" size="small" startIcon={<IconArrowLeft size={16} />} onClick={p.aoVoltar} sx={{ mb: 1 }}>
      {dataCompleta(i.data)}
    </Button>
  );
  const rotulo =
    i.origem === 'EVENTO' ? (i.tipoEvento ? ROTULO_TIPO_EVENTO[i.tipoEvento] : 'Evento') : i.origem === 'TAREFA' ? 'Tarefa da Secretaria' : i.origem === 'DOCUMENTO' ? 'Vencimento de documento' : 'Data de projeto';
  const cabecalho = (
    <>
      {voltar}
      <Typography variant="overline" color={`${cor}.main`} display="block">
        {rotulo}
      </Typography>
      <Typography variant="h5" sx={{ overflowWrap: 'anywhere', textDecoration: i.concluido ? 'line-through' : 'none' }}>
        {i.titulo}
      </Typography>
    </>
  );
  const quando = `${dataCompleta(i.data)}${horario(i) ? ` · ${horario(i)}` : ''}`;

  if (i.origem === 'EVENTO') {
    if (!evento) return <>{cabecalho}<LinearProgress sx={{ mt: 2 }} /></>;
    const e = evento;
    return (
      <Box>
        {cabecalho}
        {p.podeAlterarEvento ? (
          <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
            {e.concluido ? (
              <Button size="small" variant="outlined" startIcon={<IconRotate size={16} />} onClick={p.aoReabrir}>
                Reabrir
              </Button>
            ) : (
              <Button size="small" variant="contained" startIcon={<IconCheck size={16} />} onClick={p.aoConcluir}>
                Concluir
              </Button>
            )}
            <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={p.aoEditar}>
              Editar
            </Button>
            <Button size="small" variant="outlined" startIcon={<IconCalendarEvent size={16} />} onClick={p.aoMover}>
              Mover para…
            </Button>
            <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={p.aoExcluir}>
              Excluir
            </Button>
          </Stack>
        ) : null}
        <Grid container spacing={2} mt={0.5}>
          <Fato rotulo="Quando" largo>
            {quando}
          </Fato>
          {e.local ? <Fato rotulo="Local">{e.local}</Fato> : null}
          {e.responsavel ? <Fato rotulo="Responsável">{e.responsavel}</Fato> : null}
          {e.participantes ? (
            <Fato rotulo="Participantes" largo>
              {e.participantes}
            </Fato>
          ) : null}
          <Fato rotulo="Prioridade">
            <Chip size="small" color={COR_PRIORIDADE[e.prioridade]} label={ROTULO_PRIORIDADE[e.prioridade]} />
          </Fato>
          {e.total > 1 && e.frequencia ? (
            <Fato rotulo="Repetição" largo>
              ↻ {ROTULO_FREQUENCIA[e.frequencia]} · {e.posicao}ª de {e.total} datas (até {formatarData(e.ultimaData)})
            </Fato>
          ) : null}
          {e.tarefaId ? (
            <Fato rotulo="Tarefa ligada" largo>
              {p.verTarefas ? (
                <Link component={LinkRouter} to={`/secretaria?tarefa=${e.tarefaId}`}>
                  {e.tarefaTitulo} →
                </Link>
              ) : (
                e.tarefaTitulo
              )}
            </Fato>
          ) : null}
        </Grid>
        {e.descricao ? (
          <Typography mt={2} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {e.descricao}
          </Typography>
        ) : null}
        <HistoricoDoRegistro carregar={() => servicoAgenda.historico(e.id)} versao={e.atualizadoEm} />
      </Box>
    );
  }

  if (i.origem === 'TAREFA') {
    const feita = !!tarefa && (tarefa.feitaHoje || (!tarefa.recorrente && tarefa.status === 'CONCLUIDA'));
    return (
      <Box>
        {cabecalho}
        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
          {p.podeAlterarTarefa && tarefa ? (
            <>
              {feita ? (
                <Button size="small" variant="outlined" startIcon={<IconRotate size={16} />} onClick={p.aoReabrir}>
                  Reabrir
                </Button>
              ) : (
                <Button size="small" variant="contained" startIcon={<IconCheck size={16} />} onClick={p.aoConcluir} disabled={rotinaFutura(tarefa)}>
                  {tarefa.recorrente ? 'Fiz hoje' : 'Concluir'}
                </Button>
              )}
              <Button size="small" variant="outlined" startIcon={<IconCalendarEvent size={16} />} onClick={p.aoMover}>
                Mover para…
              </Button>
            </>
          ) : null}
          <Button size="small" variant="outlined" component={LinkRouter} to={`/secretaria?tarefa=${i.refId}`} endIcon={<IconArrowRight size={16} />}>
            Abrir na Secretaria
          </Button>
        </Stack>
        <Grid container spacing={2} mt={0.5}>
          <Fato rotulo={i.recorrente ? 'Próxima vez' : 'Prazo'} largo>
            {quando}
          </Fato>
          {i.responsavel ? <Fato rotulo="Responsável">{i.responsavel}</Fato> : null}
          <Fato rotulo="Prioridade">
            <Chip size="small" color={COR_PRIORIDADE[i.prioridade]} label={ROTULO_PRIORIDADE[i.prioridade]} />
          </Fato>
        </Grid>
        {i.descricao ? (
          <Typography mt={2} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {i.descricao}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Box>
      {cabecalho}
      <Grid container spacing={2} mt={0.5}>
        <Fato rotulo="Quando" largo>
          {quando}
        </Fato>
        {i.responsavel ? <Fato rotulo="Responsável">{i.responsavel}</Fato> : null}
      </Grid>
      {i.descricao ? (
        <Typography mt={2} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {i.descricao}
        </Typography>
      ) : null}
      <Typography variant="body2" color="textSecondary" mt={2}>
        Esta data vem de outro módulo; para mudá-la, abra o registro original.
      </Typography>
    </Box>
  );
};

export default PainelItem;

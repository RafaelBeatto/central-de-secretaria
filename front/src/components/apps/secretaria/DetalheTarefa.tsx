import { Box, Button, Chip, Grid, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconArrowLeft, IconCheck, IconEdit, IconRotate, IconTrash, IconX } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import { servicoTarefas } from 'src/servicos/tarefas';
import { Prioridade, ROTULO_FREQUENCIA, ROTULO_PRIORIDADE } from 'src/types/comum';
import { ROTULO_STATUS_TAREFA, StatusTarefa, Tarefa } from 'src/types/tarefas';
import { formatarData } from 'src/utils/formatacao';
import { situacaoPrazo } from 'src/utils/tarefas';
import ChecklistTarefa from './ChecklistTarefa';

const STATUS_EDITAVEIS: StatusTarefa[] = ['PENDENTE', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDA', 'CANCELADA'];

interface Props {
  tarefa: Tarefa;
  podeAlterar: boolean;
  executar: (acao: () => Promise<Tarefa>, mensagem?: (t: Tarefa) => string) => Promise<Tarefa | null>;
  aoConcluir: () => void;
  aoReabrir: () => void;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoFechar: () => void;
}

const Fato = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <Grid item xs={12} sm={6}>
    <Typography variant="caption" color="textSecondary" display="block">
      {rotulo}
    </Typography>
    <Box component="div">{children}</Box>
  </Grid>
);

/** Painel ao lado da lista (no celular ocupa a tela, com "← Tarefas"). */
const DetalheTarefa = ({ tarefa: t, podeAlterar, executar, aoConcluir, aoReabrir, aoEditar, aoExcluir, aoFechar }: Props) => {
  const prazo = situacaoPrazo(t);
  const feita = t.feitaHoje || (!t.recorrente && t.status === 'CONCLUIDA');
  const hora = t.horario?.slice(0, 5);

  const acaoPrincipal =
    t.status === 'CANCELADA' ? (
      <Button size="small" variant="outlined" startIcon={<IconRotate size={16} />} onClick={aoReabrir}>
        Reativar
      </Button>
    ) : feita ? (
      <Button size="small" variant="outlined" startIcon={<IconRotate size={16} />} onClick={aoReabrir}>
        Reabrir
      </Button>
    ) : (
      <Button
        size="small"
        variant="contained"
        startIcon={<IconCheck size={16} />}
        onClick={aoConcluir}
        disabled={t.recorrente && prazo.tom === 'success'}
      >
        {t.recorrente ? 'Fiz hoje' : 'Concluir'}
      </Button>
    );

  return (
    <BlankCard>
      <Box p={{ xs: 2, md: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Button color="inherit" size="small" startIcon={<IconArrowLeft size={16} />} onClick={aoFechar} sx={{ display: { md: 'none' } }}>
            Tarefas
          </Button>
          <Typography variant="caption" color="textSecondary">
            {t.codigo}
          </Typography>
          <IconButton size="small" aria-label="Fechar detalhe" onClick={aoFechar}>
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
          {t.titulo}
        </Typography>

        {podeAlterar ? (
          <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
            {acaoPrincipal}
            <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={aoEditar}>
              Editar
            </Button>
            <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={aoExcluir}>
              Excluir
            </Button>
          </Stack>
        ) : null}

        <Grid container spacing={2} mt={1}>
          <Fato rotulo={t.recorrente ? 'Próxima vez' : 'Prazo'}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <span>
                {t.prazoEfetivo ? formatarData(t.prazoEfetivo) : 'Sem prazo'}
                {hora ? ` · ${hora}` : ''}
              </span>
              {t.prazoEfetivo ? <Chip size="small" color={prazo.tom} label={prazo.texto} /> : null}
            </Stack>
          </Fato>
          <Fato rotulo="Prioridade">
            <TextField
              select
              size="small"
              value={t.prioridade}
              disabled={!podeAlterar}
              onChange={(e) => executar(() => servicoTarefas.alterarPrioridade(t.id, e.target.value as Prioridade))}
              inputProps={{ 'aria-label': 'Prioridade' }}
            >
              {(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => (
                <MenuItem key={p} value={p}>
                  {ROTULO_PRIORIDADE[p]}
                </MenuItem>
              ))}
            </TextField>
          </Fato>
          {t.recorrente && t.frequencia ? (
            <Fato rotulo="Rotina">
              ↻ {ROTULO_FREQUENCIA[t.frequencia]}
              {t.status === 'CANCELADA' ? ' · encerrada' : ''}
              {t.ultimaOcorrencia ? ` · última vez ${formatarData(t.ultimaOcorrencia)}` : ''}
              {podeAlterar && t.status !== 'CANCELADA' ? (
                <Box>
                  <Button
                    size="small"
                    color="error"
                    sx={{ px: 0 }}
                    onClick={() => executar(() => servicoTarefas.alterarStatus(t.id, 'CANCELADA'), () => 'Rotina encerrada.')}
                  >
                    Encerrar rotina
                  </Button>
                </Box>
              ) : null}
            </Fato>
          ) : (
            <Fato rotulo="Situação">
              <TextField
                select
                size="small"
                value={t.status}
                disabled={!podeAlterar}
                onChange={(e) => executar(() => servicoTarefas.alterarStatus(t.id, e.target.value as StatusTarefa))}
                inputProps={{ 'aria-label': 'Situação' }}
              >
                {STATUS_EDITAVEIS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {ROTULO_STATUS_TAREFA[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Fato>
          )}
          <Fato rotulo="Responsável">{t.responsavel || '—'}</Fato>
          <Fato rotulo="Categoria">{t.categoria || '—'}</Fato>
        </Grid>

        {t.descricao ? (
          <Typography mt={2} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {t.descricao}
          </Typography>
        ) : null}

        <ChecklistTarefa tarefa={t} podeAlterar={podeAlterar} executar={executar} />
        <HistoricoDoRegistro carregar={() => servicoTarefas.historico(t.id)} versao={`${t.atualizadoEm}|${t.subtarefas.map((s) => `${s.id}${s.feita ? '+' : '-'}`).join()}`} />
      </Box>
    </BlankCard>
  );
};

export default DetalheTarefa;

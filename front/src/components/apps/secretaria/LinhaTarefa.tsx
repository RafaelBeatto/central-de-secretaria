import { Box, Chip, IconButton, ListItemButton, Stack, Tooltip, Typography } from '@mui/material';
import { IconCheck, IconRepeat } from '@tabler/icons-react';
import type { Tarefa } from 'src/types/tarefas';
import { ROTULO_STATUS_TAREFA } from 'src/types/tarefas';
import { COR_PRIORIDADE, ROTULO_FREQUENCIA, ROTULO_PRIORIDADE } from 'src/types/comum';
import { formatarData } from 'src/utils/formatacao';
import { GrupoTarefa, progressoSubtarefas, quando, rotinaFutura } from 'src/utils/tarefas';

interface Props {
  tarefa: Tarefa;
  grupo: GrupoTarefa;
  selecionada: boolean;
  podeAlterar: boolean;
  aoAbrir: () => void;
  aoMarcar: () => void;
}

/** Linha da lista: círculo de concluir, título, informações e "quando". */
const LinhaTarefa = ({ tarefa: t, grupo, selecionada, podeAlterar, aoAbrir, aoMarcar }: Props) => {
  const feita = t.feitaHoje || grupo === 'concluidas';
  const bloqueada = rotinaFutura(t);
  const prog = progressoSubtarefas(t);
  const destaquePrioridade = !feita && (t.prioridade === 'ALTA' || t.prioridade === 'URGENTE');
  const meta = [
    t.responsavel,
    t.categoria,
    t.recorrente && t.frequencia ? `↻ ${ROTULO_FREQUENCIA[t.frequencia]}` : null,
    prog.total ? `☑ ${prog.feitas}/${prog.total}` : null,
    t.status === 'EM_ANDAMENTO' || t.status === 'AGUARDANDO' ? ROTULO_STATUS_TAREFA[t.status] : null,
  ].filter(Boolean);

  const dicaMarcar = feita
    ? t.status === 'CANCELADA'
      ? 'Reativar'
      : 'Desfazer'
    : bloqueada
      ? `Próxima vez: ${formatarData(t.prazoEfetivo)}`
      : t.recorrente
        ? 'Marcar como feita hoje'
        : 'Concluir';

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ opacity: t.status === 'CANCELADA' ? 0.6 : 1 }}>
      <Tooltip title={dicaMarcar}>
        <span>
          <IconButton
            size="small"
            aria-label={`${dicaMarcar}: ${t.titulo}`}
            disabled={!podeAlterar || (bloqueada && !feita)}
            onClick={aoMarcar}
            sx={{
              border: 2,
              borderColor: feita ? 'success.main' : 'divider',
              bgcolor: feita ? 'success.main' : 'transparent',
              color: feita ? 'white' : 'transparent',
              width: 26,
              height: 26,
              '&:hover': { borderColor: 'success.main', color: feita ? 'white' : 'success.main' },
            }}
          >
            <IconCheck size={14} />
          </IconButton>
        </span>
      </Tooltip>
      <ListItemButton selected={selecionada} onClick={aoAbrir} sx={{ borderRadius: 1, py: 1, px: 1.5, minWidth: 0 }}>
        <Box flexGrow={1} minWidth={0}>
          <Typography
            variant="subtitle1"
            fontWeight={500}
            noWrap
            sx={{ textDecoration: feita ? 'line-through' : 'none', color: feita ? 'text.secondary' : 'text.primary' }}
          >
            {t.titulo}
          </Typography>
          {meta.length ? (
            <Typography variant="caption" color="textSecondary" noWrap display="flex" alignItems="center" gap={0.5}>
              {t.recorrente ? <IconRepeat size={12} /> : null}
              {meta.join(' · ')}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0} ml={1}>
          {destaquePrioridade ? (
            <Chip size="small" color={COR_PRIORIDADE[t.prioridade]} label={ROTULO_PRIORIDADE[t.prioridade]} />
          ) : null}
          <Typography variant="body2" color={grupo === 'atrasadas' ? 'error.main' : 'textSecondary'} fontWeight={grupo === 'atrasadas' ? 600 : 400}>
            {quando(t, grupo)}
          </Typography>
        </Stack>
      </ListItemButton>
    </Stack>
  );
};

export default LinhaTarefa;

import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { Draggable } from 'react-beautiful-dnd';
import BlankCard from 'src/components/shared/BlankCard';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { COR_PRIORIDADE, ROTULO_PRIORIDADE } from 'src/types/comum';
import { ROTULO_STATUS_TAREFA, StatusTarefa, Tarefa } from 'src/types/tarefas';
import { progressoSubtarefas, situacaoPrazo } from 'src/utils/tarefas';

interface Props {
  tarefa: Tarefa;
  indice: number;
  colunas: StatusTarefa[];
  podeAlterar: boolean;
  aoAbrir: () => void;
  aoMover: (destino: StatusTarefa) => void;
}

/** Cartão do quadro (mesma composição do TaskData do template). */
const CartaoTarefa = ({ tarefa: t, indice, colunas, podeAlterar, aoAbrir, aoMover }: Props) => {
  const prazo = situacaoPrazo(t);
  const prog = progressoSubtarefas(t);
  const destaque = t.prioridade === 'ALTA' || t.prioridade === 'URGENTE';

  return (
    <Draggable draggableId={String(t.id)} index={indice} isDragDisabled={!podeAlterar}>
      {(arrastavel) => (
        <Box ref={arrastavel.innerRef} {...arrastavel.draggableProps} {...arrastavel.dragHandleProps} mb={2}>
          <BlankCard>
            <Box p={2}>
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Box flexGrow={1} minWidth={0} onClick={aoAbrir} sx={{ cursor: 'pointer' }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
                    {t.titulo}
                  </Typography>
                </Box>
                {podeAlterar ? (
                  <MenuAcoes
                    rotulo={`Mover ${t.titulo}`}
                    acoes={colunas
                      .filter((c) => c !== t.status)
                      .map((c) => ({ rotulo: `Mover para ${ROTULO_STATUS_TAREFA[c]}`, aoClicar: () => aoMover(c) }))}
                  />
                ) : null}
              </Stack>
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap alignItems="center">
                {t.prazoEfetivo || t.status === 'CONCLUIDA' ? <Chip size="small" color={prazo.tom} label={prazo.texto} /> : null}
                {destaque ? <Chip size="small" color={COR_PRIORIDADE[t.prioridade]} label={ROTULO_PRIORIDADE[t.prioridade]} /> : null}
                {t.recorrente ? <Typography variant="caption" title="Tarefa que se repete">↻</Typography> : null}
                {prog.total ? <Typography variant="caption">☑ {prog.feitas}/{prog.total}</Typography> : null}
              </Stack>
              {prog.total ? <LinearProgress variant="determinate" value={prog.pct} sx={{ mt: 1, height: 4, borderRadius: 2 }} /> : null}
              {t.responsavel ? (
                <Typography variant="caption" color="textSecondary" display="block" mt={1} noWrap>
                  {t.responsavel}
                </Typography>
              ) : null}
            </Box>
          </BlankCard>
        </Box>
      )}
    </Draggable>
  );
};

export default CartaoTarefa;

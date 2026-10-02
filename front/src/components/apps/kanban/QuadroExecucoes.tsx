import { Alert, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import SimpleBar from 'simplebar-react';
import { useNavigate } from 'react-router-dom';
import BlankCard from 'src/components/shared/BlankCard';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoProjetos } from 'src/servicos/projetos';
import { ExecucaoResumo, ROTULO_STATUS_EXECUCAO, StatusExecucao } from 'src/types/projetos';
import { diasAte } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData, normalizar } from 'src/utils/formatacao';
import ColunaKanban from './ColunaKanban';

const COLUNAS: StatusExecucao[] = ['PLANEJAMENTO', 'EM_EXECUCAO', 'SUSPENSO', 'CONCLUIDO'];
const COR_COLUNA: Record<string, string> = {
  PLANEJAMENTO: 'primary.light',
  EM_EXECUCAO: 'secondary.light',
  SUSPENSO: 'warning.light',
  CONCLUIDO: 'success.light',
};

interface Props {
  filtro: { busca: string; responsavel: string };
  podeAlterar: boolean;
}

/**
 * Quadro "Execuções de projeto" (old/js/15-kanban.js: kbProjetos). Canceladas e de recursos
 * arquivados não aparecem. Mover para Concluído com etapas pendentes pede confirmação.
 */
const QuadroExecucoes = ({ filtro, podeAlterar }: Props) => {
  const navegar = useNavigate();
  const { notificar, confirmar } = useInteracao();
  const { dados, carregando, erro, definirDados } = useConsulta(servicoProjetos.execucoesDoKanban);

  const q = normalizar(filtro.busca);
  const visiveis = (dados ?? []).filter(
    (e) => (!q || normalizar(`${e.nome} ${e.responsavel ?? ''} ${e.recursoNome}`).includes(q)) && (!filtro.responsavel || e.responsavel === filtro.responsavel),
  );

  const mover = async (e: ExecucaoResumo, destino: StatusExecucao) => {
    if (e.status === destino) return;
    const faltam = destino === 'CONCLUIDO' ? e.situacao.etapas.filter((x) => !x.ok) : [];
    if (
      faltam.length &&
      !(await confirmar(`"${e.nome}" ainda tem ${faltam.length} etapa(s) pendente(s): ${faltam.map((x) => x.rotulo).join(', ')}. Marcar como concluído mesmo assim?`, { rotuloConfirmar: 'Concluir mesmo assim' }))
    ) {
      return;
    }
    try {
      const nova = await servicoProjetos.alterarStatus(e.id, destino);
      definirDados((lista) => (lista ?? []).map((x) => (x.id === nova.id ? nova : x)));
      notificar(ROTULO_STATUS_EXECUCAO[destino]);
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    }
  };

  const aoSoltar = ({ draggableId, destination, source }: DropResult) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const e = visiveis.find((x) => `execucao-${x.id}` === draggableId);
    if (e) mover(e, destination.droppableId as StatusExecucao);
  };

  if (erro) return <Alert severity="error">{erro}</Alert>;
  if (carregando && !dados) return <LinearProgress />;

  return (
    <SimpleBar>
      <DragDropContext onDragEnd={aoSoltar}>
        <Box display="flex" gap={2} pb={2}>
          {COLUNAS.map((coluna) => {
            const cartoes = visiveis.filter((e) => e.status === coluna).sort((a, b) => a.dataFim.localeCompare(b.dataFim) || a.nome.localeCompare(b.nome, 'pt-BR'));
            return (
              <ColunaKanban key={coluna} id={coluna} titulo={ROTULO_STATUS_EXECUCAO[coluna]} quantidade={cartoes.length} corFundo={COR_COLUNA[coluna]}>
                {cartoes.map((e, indice) => {
                  const faltam = e.situacao.etapas.length - e.situacao.etapasFeitas;
                  const atrasada = e.status !== 'CONCLUIDO' && diasAte(e.dataFim) < 0;
                  return (
                    <Draggable key={e.id} draggableId={`execucao-${e.id}`} index={indice} isDragDisabled={!podeAlterar}>
                      {(arrastavel) => (
                        <Box ref={arrastavel.innerRef} {...arrastavel.draggableProps} {...arrastavel.dragHandleProps} mb={2}>
                          <BlankCard>
                            <Box p={2}>
                              <Stack direction="row" alignItems="flex-start" spacing={1}>
                                <Box flexGrow={1} minWidth={0} onClick={() => navegar(`/projetos?execucao=${e.id}`)} sx={{ cursor: 'pointer' }}>
                                  <Typography variant="subtitle1" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
                                    {e.nome}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {e.recursoNome}
                                  </Typography>
                                </Box>
                                {podeAlterar ? (
                                  <MenuAcoes
                                    rotulo={`Mover ${e.nome}`}
                                    acoes={COLUNAS.filter((c) => c !== e.status).map((c) => ({ rotulo: `Mover para ${ROTULO_STATUS_EXECUCAO[c]}`, aoClicar: () => mover(e, c) }))}
                                  />
                                ) : null}
                              </Stack>
                              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap alignItems="center">
                                <Chip size="small" color={atrasada ? 'error' : 'default'} label={`até ${formatarData(e.dataFim)}`} />
                                {faltam ? <Chip size="small" color="warning" label={`${faltam} etapa${faltam === 1 ? '' : 's'}`} title="Etapas do checklist que faltam" /> : <Chip size="small" color="success" label="✓ checklist" />}
                              </Stack>
                              <LinearProgress variant="determinate" value={Math.min(100, e.situacao.percentualPago)} sx={{ mt: 1, height: 4, borderRadius: 2 }} />
                              <Typography variant="caption" color="textSecondary">
                                {e.situacao.percentualPago}% pago
                              </Typography>
                              {e.responsavel ? (
                                <Typography variant="caption" color="textSecondary" display="block" noWrap>
                                  {e.responsavel}
                                </Typography>
                              ) : null}
                            </Box>
                          </BlankCard>
                        </Box>
                      )}
                    </Draggable>
                  );
                })}
              </ColunaKanban>
            );
          })}
        </Box>
      </DragDropContext>
    </SimpleBar>
  );
};

export default QuadroExecucoes;

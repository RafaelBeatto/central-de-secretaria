import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, LinearProgress, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import SimpleBar from 'simplebar-react';
import { useNavigate } from 'react-router-dom';
import Pagina from 'src/components/container/Pagina';
import ColunaKanban from 'src/components/apps/kanban/ColunaKanban';
import CartaoTarefa from 'src/components/apps/kanban/CartaoTarefa';
import QuadroExecucoes from 'src/components/apps/kanban/QuadroExecucoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { useAcoesTarefa } from 'src/hooks/useAcoesTarefa';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoTarefas } from 'src/servicos/tarefas';
import { ROTULO_STATUS_TAREFA, StatusTarefa, Tarefa } from 'src/types/tarefas';
import { useSelector } from 'src/store/Store';
import { hojeIso, somarDias } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { normalizar } from 'src/utils/formatacao';
import { ordenarTarefas } from 'src/utils/tarefas';

const COLUNAS: StatusTarefa[] = ['PENDENTE', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDA'];
const COR_COLUNA: Record<string, string> = {
  PENDENTE: 'primary.light',
  EM_ANDAMENTO: 'secondary.light',
  AGUARDANDO: 'warning.light',
  CONCLUIDA: 'success.light',
};
const DIAS_CONCLUIDAS = 14;

/**
 * Quadro de tarefas por situação (old/js/15-kanban.js). Mover para "Concluída"
 * é o mesmo "Concluir" da Secretaria (rotina volta no próximo ciclo).
 * O quadro "Execuções de projeto" aparece para quem lê projetos.
 */
const Kanban = () => {
  const navegar = useNavigate();
  const { podeAlterar, tem } = usePermissao();
  const verExecucoes = tem(PERMISSOES.PROJETO_LER);
  const [quadro, setQuadro] = useState<'tarefas' | 'execucoes'>('tarefas');
  const { notificar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.TAREFA_ESCREVER);
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);
  const [verTodas, setVerTodas] = useState(false);
  const [antigas, setAntigas] = useState<Tarefa[]>([]);
  const [filtro, setFiltro] = useState({ busca: '', responsavel: '' });

  const { dados, carregando, erro, definirDados } = useConsulta(() =>
    servicoTarefas.ativas(somarDias(hojeIso(), -DIAS_CONCLUIDAS)),
  );

  useEffect(() => {
    setVerTodas(false);
    setAntigas([]);
  }, [unidadeVisualizadaId]);

  const substituir = useCallback(
    (t: Tarefa) => {
      definirDados((lista) => [...(lista ?? []).filter((x) => x.id !== t.id), t]);
      setAntigas((lista) => lista.filter((x) => x.id !== t.id));
    },
    [definirDados],
  );
  const { executar, concluir } = useAcoesTarefa(substituir);

  const todas = useMemo(() => {
    const ids = new Set((dados ?? []).map((t) => t.id));
    return [...(dados ?? []), ...antigas.filter((t) => !ids.has(t.id))].filter((t) => t.status !== 'CANCELADA');
  }, [dados, antigas]);

  const responsaveis = [...new Set(todas.map((t) => t.responsavel).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const q = normalizar(filtro.busca);
  const visiveis = todas.filter(
    (t) =>
      (!q || normalizar(`${t.titulo} ${t.responsavel ?? ''}`).includes(q)) &&
      (!filtro.responsavel || t.responsavel === filtro.responsavel),
  );

  const mover = (t: Tarefa, destino: StatusTarefa) => {
    if (t.status === destino) return;
    if (destino === 'CONCLUIDA') concluir(t);
    else executar(() => servicoTarefas.alterarStatus(t.id, destino), () => ROTULO_STATUS_TAREFA[destino]);
  };

  const aoSoltar = ({ draggableId, destination, source }: DropResult) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const tarefa = todas.find((t) => String(t.id) === draggableId);
    if (tarefa) mover(tarefa, destination.droppableId as StatusTarefa);
  };

  const adicionar = (status: StatusTarefa) => async (titulo: string) => {
    try {
      substituir(await servicoTarefas.criarRapida(titulo, { status, responsavel: filtro.responsavel || undefined }));
      return true;
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
      return false;
    }
  };

  const alternarTodas = async () => {
    if (verTodas) {
      setVerTodas(false);
      setAntigas([]);
      return;
    }
    try {
      setAntigas((await servicoTarefas.encerradas(200)).filter((t) => t.status === 'CONCLUIDA'));
      setVerTodas(true);
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return (
    <Pagina>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={3}>
        {verExecucoes ? (
          <ToggleButtonGroup size="small" exclusive value={quadro} onChange={(_, v) => v && setQuadro(v)} aria-label="Quadro">
            <ToggleButton value="tarefas">Tarefas</ToggleButton>
            <ToggleButton value="execucoes">Execuções de projeto</ToggleButton>
          </ToggleButtonGroup>
        ) : null}
        <TextField
          type="search"
          size="small"
          placeholder="Buscar…"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar no quadro' }}
          sx={{ minWidth: { sm: 280 } }}
        />
        {responsaveis.length ? (
          <TextField select size="small" value={filtro.responsavel} onChange={(e) => setFiltro({ ...filtro, responsavel: e.target.value })} sx={{ minWidth: 220 }} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Responsável' }}>
            <MenuItem value="">Todos os responsáveis</MenuItem>
            {responsaveis.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </Stack>
      {quadro === 'execucoes' ? <QuadroExecucoes filtro={filtro} podeAlterar={podeAlterar(PERMISSOES.PROJETO_ESCREVER)} /> : null}
      {quadro === 'tarefas' && carregando && !dados ? <LinearProgress /> : null}
      {quadro === 'tarefas' && erro ? <Alert severity="error">{erro}</Alert> : null}
      {quadro === 'tarefas' && dados ? (
        <SimpleBar>
          <DragDropContext onDragEnd={aoSoltar}>
            <Box display="flex" gap={2} pb={2}>
              {COLUNAS.map((coluna) => {
                const cartoes = visiveis.filter((t) => t.status === coluna).sort(ordenarTarefas);
                const concluida = coluna === 'CONCLUIDA';
                return (
                  <ColunaKanban
                    key={coluna}
                    id={coluna}
                    titulo={ROTULO_STATUS_TAREFA[coluna]}
                    quantidade={cartoes.length}
                    corFundo={COR_COLUNA[coluna]}
                    aoAdicionar={alterar && !concluida ? adicionar(coluna) : undefined}
                    nota={
                      concluida ? (
                        <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                          {verTodas ? 'Todas as concluídas.' : `Últimos ${DIAS_CONCLUIDAS} dias.`}{' '}
                          <Button size="small" onClick={alternarTodas} sx={{ p: 0, minWidth: 0 }}>
                            {verTodas ? 'Só as recentes' : 'Ver todas'}
                          </Button>
                        </Typography>
                      ) : undefined
                    }
                  >
                    {cartoes.map((t, indice) => (
                      <CartaoTarefa
                        key={t.id}
                        tarefa={t}
                        indice={indice}
                        colunas={COLUNAS}
                        podeAlterar={alterar}
                        aoAbrir={() => navegar(`/secretaria?tarefa=${t.id}`)}
                        aoMover={(destino) => mover(t, destino)}
                      />
                    ))}
                  </ColunaKanban>
                );
              })}
            </Box>
          </DragDropContext>
        </SimpleBar>
      ) : null}
    </Pagina>
  );
};

export default Kanban;

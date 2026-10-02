import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Grid, LinearProgress, MenuItem, Stack, TextField, Theme, useMediaQuery } from '@mui/material';
import Pagina from 'src/components/container/Pagina';
import BarraNovaTarefa from 'src/components/apps/secretaria/BarraNovaTarefa';
import ListaTarefas from 'src/components/apps/secretaria/ListaTarefas';
import DetalheTarefa from 'src/components/apps/secretaria/DetalheTarefa';
import FormularioTarefa from 'src/components/apps/secretaria/FormularioTarefa';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { useAcoesTarefa } from 'src/hooks/useAcoesTarefa';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoTarefas } from 'src/servicos/tarefas';
import { Prioridade, ROTULO_PRIORIDADE } from 'src/types/comum';
import type { SugestoesTarefa, Tarefa } from 'src/types/tarefas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { useSelector } from 'src/store/Store';
import { normalizar } from 'src/utils/formatacao';
import { encerrada, GrupoTarefa } from 'src/utils/tarefas';

const SEM_SUGESTOES: SugestoesTarefa = { responsaveis: [], categorias: [] };

/** Secretaria: tarefas e rotinas do dia a dia (old/js/05a-secretaria.js). */
const Secretaria = () => {
  const { podeAlterar } = usePermissao();
  const { notificar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.TAREFA_ESCREVER);
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);

  const { dados: ativas, carregando, erro, definirDados } = useConsulta(() => servicoTarefas.ativas());
  const { dados: sugestoes, recarregar: recarregarSugestoes } = useConsulta(servicoTarefas.sugestoes);
  const [encerradas, setEncerradas] = useState<Tarefa[] | null>(null);
  const [verEncerradas, setVerEncerradas] = useState(false);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState({ busca: '', responsavel: '', prioridade: '' });
  const [formulario, setFormulario] = useState<{ aberto: boolean; tarefa: Tarefa | null; titulo?: string }>({ aberto: false, tarefa: null });

  // Uma alteração vinda do back substitui a tarefa na lista certa (ativas ou encerradas).
  const substituir = useCallback(
    (t: Tarefa) => {
      const ativa = !encerrada(t) || t.feitaHoje;
      definirDados((lista) => {
        const semEla = (lista ?? []).filter((x) => x.id !== t.id);
        return ativa ? [...semEla, t] : semEla;
      });
      setEncerradas((lista) => {
        if (lista === null) return lista;
        const semEla = lista.filter((x) => x.id !== t.id);
        return ativa ? semEla : [t, ...semEla];
      });
    },
    [definirDados],
  );
  const retirar = useCallback(
    (id: number) => {
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== id));
      setEncerradas((lista) => lista?.filter((x) => x.id !== id) ?? null);
      setSelecionadaId((atual) => (atual === id ? null : atual));
    },
    [definirDados],
  );
  const { executar, concluir, reabrir, excluir } = useAcoesTarefa(substituir, retirar);

  // Mudou a unidade em consulta: a seção de encerradas precisa ser buscada de novo.
  useEffect(() => {
    setEncerradas(null);
    setSelecionadaId(null);
  }, [unidadeVisualizadaId]);
  useEffect(() => {
    if (verEncerradas && encerradas === null) {
      servicoTarefas
        .encerradas()
        .then((lista) => setEncerradas(lista.filter((t) => !t.feitaHoje)))
        .catch((e) => notificar(mensagemDeErro(e), 'error'));
    }
  }, [verEncerradas, encerradas, notificar]);

  // Vindo do Kanban (ou de outra tela): /secretaria?tarefa=ID abre o detalhe dela.
  const [parametros, setParametros] = useSearchParams();
  const tarefaPedida = Number(parametros.get('tarefa')) || null;
  useEffect(() => {
    if (!tarefaPedida || !ativas) return;
    setSelecionadaId(tarefaPedida);
    if (!ativas.some((t) => t.id === tarefaPedida)) {
      servicoTarefas
        .detalhe(tarefaPedida)
        .then((t) => setEncerradas((lista) => [t, ...(lista ?? []).filter((x) => x.id !== t.id)]))
        .catch((e) => notificar(mensagemDeErro(e), 'error'));
    }
    setParametros({}, { replace: true });
  }, [tarefaPedida, ativas, notificar, setParametros]);

  const todas = useMemo(() => [...(ativas ?? []), ...(encerradas ?? [])], [ativas, encerradas]);
  const selecionada = todas.find((t) => t.id === selecionadaId) ?? null;

  const filtrar = useCallback(
    (lista: Tarefa[]) => {
      const q = normalizar(filtro.busca);
      return lista.filter(
        (t) =>
          (!q || normalizar([t.titulo, t.descricao, t.responsavel, t.categoria].join(' ')).includes(q)) &&
          (!filtro.responsavel || t.responsavel === filtro.responsavel) &&
          (!filtro.prioridade || t.prioridade === filtro.prioridade),
      );
    },
    [filtro],
  );
  const temFiltro = !!(filtro.busca || filtro.responsavel || filtro.prioridade);
  const responsaveis = [...new Set(todas.map((t) => t.responsavel).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const marcar = (t: Tarefa, grupo: GrupoTarefa) => (t.feitaHoje || grupo === 'concluidas' ? reabrir(t) : concluir(t));

  const adicionarRapido = async (titulo: string, prazo: string) => {
    try {
      substituir(await servicoTarefas.criarRapida(titulo, { prazo }));
      return true;
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
      return false;
    }
  };

  const lista = (
    <>
      {alterar ? (
        <BarraNovaTarefa aoAdicionar={adicionarRapido} aoMaisOpcoes={(titulo) => setFormulario({ aberto: true, tarefa: null, titulo })} />
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={3}>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar tarefa…"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar tarefa' }}
          sx={{ flexGrow: 1 }}
        />
        {responsaveis.length ? (
          <TextField select size="small" value={filtro.responsavel} onChange={(e) => setFiltro({ ...filtro, responsavel: e.target.value })} sx={{ minWidth: 200 }} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Responsável' }}>
            <MenuItem value="">Todos os responsáveis</MenuItem>
            {responsaveis.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <TextField select size="small" value={filtro.prioridade} onChange={(e) => setFiltro({ ...filtro, prioridade: e.target.value })} sx={{ minWidth: 190 }} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Prioridade' }}>
          <MenuItem value="">Qualquer prioridade</MenuItem>
          {(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => (
            <MenuItem key={p} value={p}>
              {ROTULO_PRIORIDADE[p]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {carregando && !ativas ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {ativas ? (
        <ListaTarefas
          tarefas={filtrar(ativas)}
          encerradas={encerradas === null ? null : filtrar(encerradas)}
          verEncerradas={verEncerradas}
          aoAlternarEncerradas={() => setVerEncerradas((v) => !v)}
          selecionadaId={selecionadaId}
          podeAlterar={alterar}
          temFiltro={temFiltro}
          aoAbrir={(t) => setSelecionadaId((atual) => (atual === t.id && !celular ? null : t.id))}
          aoMarcar={marcar}
        />
      ) : null}
    </>
  );

  const detalhe = selecionada ? (
    <DetalheTarefa
      tarefa={selecionada}
      podeAlterar={alterar}
      executar={executar}
      aoConcluir={() => concluir(selecionada)}
      aoReabrir={() => reabrir(selecionada)}
      aoEditar={() => setFormulario({ aberto: true, tarefa: selecionada })}
      aoExcluir={() => excluir(selecionada)}
      aoFechar={() => setSelecionadaId(null)}
    />
  ) : null;

  return (
    <Pagina>
      {celular && detalhe ? (
        detalhe
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={detalhe ? 7 : 12} lg={detalhe ? 8 : 12}>
            {lista}
          </Grid>
          {detalhe ? (
            <Grid item xs={12} md={5} lg={4}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 90 } }}>{detalhe}</Box>
            </Grid>
          ) : null}
        </Grid>
      )}

      <FormularioTarefa
        aberto={formulario.aberto}
        tarefa={formulario.tarefa}
        tituloInicial={formulario.titulo}
        sugestoes={sugestoes ?? SEM_SUGESTOES}
        aoFechar={() => setFormulario({ aberto: false, tarefa: null })}
        aoSalvar={(t, nova) => {
          substituir(t);
          recarregarSugestoes();
          notificar(nova ? 'Tarefa criada.' : 'Tarefa atualizada.');
          if (nova) setSelecionadaId(t.id);
        }}
      />
    </Pagina>
  );
};

export default Secretaria;

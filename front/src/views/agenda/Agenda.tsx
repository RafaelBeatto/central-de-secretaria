import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  GlobalStyles,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconPrinter } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import BlankCard from 'src/components/shared/BlankCard';
import VisaoSemana from 'src/components/apps/agenda/VisaoSemana';
import VisaoMes from 'src/components/apps/agenda/VisaoMes';
import VisaoLista from 'src/components/apps/agenda/VisaoLista';
import PainelDia from 'src/components/apps/agenda/PainelDia';
import PainelItem from 'src/components/apps/agenda/PainelItem';
import FormularioEvento from 'src/components/apps/agenda/FormularioEvento';
import DialogoExcluirEvento from 'src/components/apps/agenda/DialogoExcluirEvento';
import DialogoMoverPara from 'src/components/apps/agenda/DialogoMoverPara';
import { COR_ORIGEM } from 'src/components/apps/agenda/cores';
import type { PropsVisao } from 'src/components/apps/agenda/visoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { useAcoesTarefa } from 'src/hooks/useAcoesTarefa';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoAgenda } from 'src/servicos/agenda';
import { servicoTarefas } from 'src/servicos/tarefas';
import { EscopoSerie, EventoDetalhe, GrupoOrigem, ItemAgenda, ModoAgenda, ROTULO_GRUPO_ORIGEM, ROTULO_TIPO_EVENTO } from 'src/types/agenda';
import type { Tarefa } from 'src/types/tarefas';
import { combinaBusca, grupoOrigem, mudarPeriodo, periodo, porDia, tituloPeriodo } from 'src/utils/agenda';
import { hojeIso } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData } from 'src/utils/formatacao';
import { useSelector } from 'src/store/Store';

const GRUPOS: GrupoOrigem[] = ['EVENTO', 'TAREFA', 'PRAZO'];

/** Ao imprimir, fica só o calendário (como o CSS de impressão do antigo). */
const ESTILO_IMPRESSAO = (
  <GlobalStyles
    styles={{
      '@media print': {
        '.mainwrapper > :not(.page-wrapper), .MuiAppBar-root, .agenda-sem-impressao': { display: 'none !important' },
        '.page-wrapper': { marginLeft: '0 !important' },
        '.agenda-area': { maxWidth: '100% !important', flexBasis: '100% !important' },
        '.agenda-calendario *': { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' },
      },
    }}
  />
);

/** Agenda: eventos, tarefas e prazos num só calendário (old/js/05-agenda.js). */
const Agenda = () => {
  const { tem, podeAlterar } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const alterarAgenda = podeAlterar(PERMISSOES.AGENDA_ESCREVER);
  const alterarTarefa = podeAlterar(PERMISSOES.TAREFA_ESCREVER);
  const verTarefas = tem(PERMISSOES.TAREFA_LER);
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);

  const [modo, setModo] = useState<ModoAgenda>('semana');
  const [ref, setRef] = useState(hojeIso());
  const [dia, setDia] = useState(hojeIso());
  const [aberto, setAberto] = useState<ItemAgenda | null>(null);
  const [evento, setEvento] = useState<EventoDetalhe | null>(null);
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [busca, setBusca] = useState('');
  const [ocultas, setOcultas] = useState<GrupoOrigem[]>([]);
  const [formulario, setFormulario] = useState<{ aberto: boolean; evento: EventoDetalhe | null; data: string }>({ aberto: false, evento: null, data: hojeIso() });
  const [excluindo, setExcluindo] = useState<EventoDetalhe | null>(null);
  const [movendo, setMovendo] = useState(false);
  const painel = useRef<HTMLDivElement>(null);

  const { inicio, fim } = periodo(modo, ref);
  const { dados, carregando, erro, recarregar } = useConsulta(() => servicoAgenda.itens(inicio, fim), [inicio, fim]);

  useEffect(() => {
    setAberto(null);
  }, [unidadeVisualizadaId]);

  // Detalhe completo do item aberto (série e tarefa ligada; ou a tarefa, com as regras da rotina).
  const carregarDetalhe = useCallback(
    async (item: ItemAgenda | null) => {
      setEvento(null);
      setTarefa(null);
      if (!item) return;
      try {
        if (item.origem === 'EVENTO') setEvento(await servicoAgenda.detalhe(item.refId));
        if (item.origem === 'TAREFA') setTarefa(await servicoTarefas.detalhe(item.refId));
      } catch (e) {
        notificar(mensagemDeErro(e), 'error');
        setAberto(null);
      }
    },
    [notificar],
  );
  useEffect(() => {
    carregarDetalhe(aberto);
  }, [aberto, carregarDetalhe]);

  // Depois de recarregar o período, o item aberto é trocado pela versão nova.
  useEffect(() => {
    if (!dados) return;
    setAberto((atual) => (atual ? (dados.find((i) => i.chave === atual.chave) ?? atual) : atual));
  }, [dados]);

  const atualizar = useCallback(async () => {
    await recarregar();
  }, [recarregar]);

  const { concluir: concluirTarefa, reabrir: reabrirTarefa } = useAcoesTarefa(
    useCallback(
      (t: Tarefa) => {
        setTarefa((atual) => (atual?.id === t.id ? t : atual));
        atualizar();
      },
      [atualizar],
    ),
  );

  const visiveis = useMemo(
    () =>
      (dados ?? []).filter(
        (i) => !ocultas.includes(grupoOrigem(i)) && combinaBusca(i, busca, i.tipoEvento ? ROTULO_TIPO_EVENTO[i.tipoEvento] : ''),
      ),
    [dados, ocultas, busca],
  );
  const mapa = useMemo(() => porDia(visiveis), [visiveis]);

  const podeMexer = (i: ItemAgenda) => (i.origem === 'EVENTO' ? alterarAgenda : i.origem === 'TAREFA' ? alterarTarefa : false);

  const mostrarPainel = () => {
    if (window.innerWidth < 1200) setTimeout(() => painel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
  };
  const escolherDia = (iso: string) => {
    setDia(iso);
    setAberto(null);
    mostrarPainel();
  };
  const abrir = (i: ItemAgenda) => {
    setDia(i.data);
    setAberto(i);
    mostrarPainel();
  };

  // ---------- ações ----------

  const acaoEvento = async (acao: () => Promise<EventoDetalhe>, mensagem: string) => {
    try {
      const e = await acao();
      if (aberto?.chave === `EVENTO-${e.id}`) setEvento(e);
      notificar(mensagem);
      await atualizar();
      return e;
    } catch (erroAcao) {
      notificar(mensagemDeErro(erroAcao), 'error');
      return null;
    }
  };

  const marcar = async (i: ItemAgenda) => {
    if (i.origem === 'EVENTO') {
      await (i.concluido
        ? acaoEvento(() => servicoAgenda.reabrir(i.refId), 'Evento reaberto.')
        : acaoEvento(() => servicoAgenda.concluir(i.refId), 'Evento concluído.'));
      return;
    }
    if (i.origem !== 'TAREFA') return;
    try {
      const t = await servicoTarefas.detalhe(i.refId);
      await (t.feitaHoje || (!t.recorrente && t.status === 'CONCLUIDA') ? reabrirTarefa(t) : concluirTarefa(t));
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const moverPara = async (i: ItemAgenda, data: string) => {
    if (i.data === data || !podeMexer(i)) return;
    try {
      if (i.origem === 'EVENTO') await servicoAgenda.moverPara(i.refId, data);
      else await servicoTarefas.moverPara(i.refId, data);
      notificar(`${i.origem === 'EVENTO' ? 'Evento movido' : 'Tarefa movida'} para ${formatarData(data)}.`);
      setDia(data);
      if (aberto?.chave === i.chave) setAberto({ ...i, data });
      await atualizar();
      if (aberto?.chave === i.chave) carregarDetalhe({ ...i, data });
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const soltar = (chave: string, iso: string) => {
    const item = (dados ?? []).find((i) => i.chave === chave);
    if (item) moverPara(item, iso);
  };

  const excluirEvento = async (e: EventoDetalhe, escopo: EscopoSerie) => {
    setExcluindo(null);
    try {
      const n = await servicoAgenda.excluir(e.id, escopo);
      notificar(n > 1 ? `${n} datas excluídas.` : 'Evento excluído.');
      setAberto(null);
      await atualizar();
    } catch (erroAcao) {
      notificar(mensagemDeErro(erroAcao), 'error');
    }
  };
  const pedirExclusao = async () => {
    if (!evento) return;
    if (evento.total > 1) {
      setExcluindo(evento);
      return;
    }
    if (await confirmar(`Excluir o evento "${evento.titulo}"?`, { rotuloConfirmar: 'Excluir' })) excluirEvento(evento, 'SO_ESTA');
  };

  const aoSalvar = async (e: EventoDetalhe, novo: boolean) => {
    notificar(novo ? (e.total > 1 ? `Evento criado em ${e.total} datas.` : 'Evento criado.') : 'Evento atualizado.');
    setDia(e.data);
    if (!(modo === 'mes' && e.data.slice(0, 7) === ref.slice(0, 7))) setRef(e.data);
    await atualizar();
    setAberto({
      chave: `EVENTO-${e.id}`,
      origem: 'EVENTO',
      refId: e.id,
      titulo: e.titulo,
      tipoEvento: e.tipo,
      prioridade: e.prioridade,
      data: e.data,
      horarioInicio: e.horarioInicio,
      horarioFim: e.horarioFim,
      local: e.local,
      responsavel: e.responsavel,
      participantes: e.participantes,
      descricao: e.descricao,
      concluido: e.concluido,
      serieId: e.serieId,
      recorrente: e.total > 1,
    });
  };

  // ---------- desenho ----------

  const propsVisao: PropsVisao = {
    porDia: mapa,
    inicio,
    fim,
    referencia: ref,
    diaEscolhido: dia,
    chaveSelecionada: aberto?.chave ?? null,
    podeArrastar: podeMexer,
    podeMarcar: podeMexer,
    aoEscolherDia: escolherDia,
    aoAbrir: abrir,
    aoMarcar: marcar,
    aoSoltar: soltar,
  };
  const trocarModo = (novo: ModoAgenda | null) => {
    if (!novo) return;
    setModo(novo);
    setRef(dia);
  };

  return (
    <Pagina>
      {ESTILO_IMPRESSAO}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between" mb={2} className="agenda-sem-impressao">
        <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
          <IconButton aria-label="Anterior" onClick={() => setRef(mudarPeriodo(modo, ref, -1))}>
            <IconChevronLeft size={20} />
          </IconButton>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setRef(hojeIso());
              setDia(hojeIso());
              setAberto(null);
            }}
          >
            Hoje
          </Button>
          <IconButton aria-label="Próximo" onClick={() => setRef(mudarPeriodo(modo, ref, 1))}>
            <IconChevronRight size={20} />
          </IconButton>
          <Typography variant="h5" component="h2" sx={{ whiteSpace: { md: 'nowrap' } }}>
            {tituloPeriodo(modo, ref)}
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <ToggleButtonGroup size="small" exclusive value={modo} onChange={(_, v) => trocarModo(v)} aria-label="Visão">
            <ToggleButton value="semana">Semana</ToggleButton>
            <ToggleButton value="mes">Mês</ToggleButton>
            <ToggleButton value="lista">Lista</ToggleButton>
          </ToggleButtonGroup>
          <TextField type="search" size="small" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} inputProps={{ 'aria-label': 'Buscar na agenda' }} />
          <Button size="small" variant="outlined" startIcon={<IconPrinter size={16} />} onClick={() => window.print()}>
            Imprimir
          </Button>
        </Stack>
      </Stack>

      {/* Só no papel: o período impresso. */}
      <Typography variant="h5" mb={2} sx={{ display: 'none', '@media print': { display: 'block' } }}>
        Agenda · {tituloPeriodo(modo, ref)}
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={2} className="agenda-sem-impressao">
        {GRUPOS.filter((g) => g !== 'TAREFA' || verTarefas).map((g) => {
          const ligado = !ocultas.includes(g);
          return (
            <Chip
              key={g}
              label={ROTULO_GRUPO_ORIGEM[g]}
              color={COR_ORIGEM[g]}
              variant={ligado ? 'filled' : 'outlined'}
              aria-pressed={ligado}
              onClick={() => setOcultas((atual) => (ligado ? [...atual, g] : atual.filter((x) => x !== g)))}
              sx={{ opacity: ligado ? 1 : 0.6 }}
            />
          );
        })}
        {alterarAgenda || alterarTarefa ? (
          <Typography variant="caption" color="textSecondary">
            <Box component="span" display={{ xs: 'none', md: 'inline' }}>
              Arraste eventos e tarefas para mudar a data.
            </Box>
            <Box component="span" display={{ xs: 'inline', md: 'none' }}>
              Para mudar a data, abra o item e use “Mover para…”.
            </Box>
          </Typography>
        ) : null}
      </Stack>

      {carregando && !dados ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8} xl={9} className="agenda-area">
          <Box sx={{ opacity: carregando && dados ? 0.6 : 1, transition: 'opacity .2s' }}>
            {modo === 'semana' ? <VisaoSemana {...propsVisao} /> : null}
            {modo === 'mes' ? <VisaoMes {...propsVisao} /> : null}
            {modo === 'lista' ? <VisaoLista {...propsVisao} vazio={`Nada marcado nos próximos 30 dias${busca ? ' com essa busca' : ''}.`} /> : null}
          </Box>
        </Grid>
        <Grid item xs={12} lg={4} xl={3} className="agenda-sem-impressao">
          <Box ref={painel} sx={{ position: { lg: 'sticky' }, top: { lg: 90 } }}>
            <BlankCard>
              <Box p={{ xs: 2, md: 3 }}>
                {aberto ? (
                  <PainelItem
                    item={aberto}
                    evento={evento}
                    tarefa={tarefa}
                    podeAlterarEvento={alterarAgenda}
                    podeAlterarTarefa={alterarTarefa}
                    verTarefas={verTarefas}
                    aoVoltar={() => setAberto(null)}
                    aoConcluir={() => (aberto.origem === 'EVENTO' ? acaoEvento(() => servicoAgenda.concluir(aberto.refId), 'Evento concluído.') : tarefa && concluirTarefa(tarefa))}
                    aoReabrir={() => (aberto.origem === 'EVENTO' ? acaoEvento(() => servicoAgenda.reabrir(aberto.refId), 'Evento reaberto.') : tarefa && reabrirTarefa(tarefa))}
                    aoEditar={() => evento && setFormulario({ aberto: true, evento, data: evento.data })}
                    aoMover={() => setMovendo(true)}
                    aoExcluir={pedirExclusao}
                  />
                ) : (
                  <PainelDia
                    dia={dia}
                    itens={mapa[dia] ?? []}
                    chaveSelecionada={null}
                    podeCriar={alterarAgenda}
                    podeMarcar={podeMexer}
                    aoNovo={() => setFormulario({ aberto: true, evento: null, data: dia })}
                    aoAbrir={abrir}
                    aoMarcar={marcar}
                  />
                )}
              </Box>
            </BlankCard>
          </Box>
        </Grid>
      </Grid>

      <FormularioEvento
        aberto={formulario.aberto}
        evento={formulario.evento}
        dataInicial={formulario.data}
        verTarefas={verTarefas}
        aoFechar={() => setFormulario((f) => ({ ...f, aberto: false }))}
        aoSalvar={aoSalvar}
      />
      <DialogoExcluirEvento evento={excluindo} aoFechar={() => setExcluindo(null)} aoEscolher={(escopo) => excluindo && excluirEvento(excluindo, escopo)} />
      <DialogoMoverPara
        aberto={movendo && !!aberto}
        titulo={aberto?.titulo ?? ''}
        dataAtual={aberto?.data ?? dia}
        aoFechar={() => setMovendo(false)}
        aoMover={(data) => {
          setMovendo(false);
          if (aberto) moverPara(aberto, data);
        }}
      />
    </Pagina>
  );
};

export default Agenda;

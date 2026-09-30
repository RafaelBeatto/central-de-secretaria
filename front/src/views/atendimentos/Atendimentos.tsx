import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconPlus, IconPrinter } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import BlankCard from 'src/components/shared/BlankCard';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import FaixaDias from 'src/components/apps/atendimentos/FaixaDias';
import LinhaAtendimento from 'src/components/apps/atendimentos/LinhaAtendimento';
import PainelAtendimento from 'src/components/apps/atendimentos/PainelAtendimento';
import PainelPessoa from 'src/components/apps/atendimentos/PainelPessoa';
import FormularioNovoAtendimento from 'src/components/apps/atendimentos/FormularioNovoAtendimento';
import DialogoRemarcar from 'src/components/apps/atendimentos/DialogoRemarcar';
import DialogoJustificarFalta from 'src/components/apps/atendimentos/DialogoJustificarFalta';
import DialogoGestaoCadastros from 'src/components/apps/atendimentos/DialogoGestaoCadastros';
import DialogoListaPresenca from 'src/components/apps/atendimentos/DialogoListaPresenca';
import DialogoRelatorio, { FiltroRelatorio } from 'src/components/apps/atendimentos/DialogoRelatorio';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoAtendimentos } from 'src/servicos/atendimentos';
import type { AtendimentoResposta } from 'src/types/atendimentos';
import { combinaBusca, efetivo, porDia, resumo } from 'src/utils/atendimentos';
import { dataPorExtenso, hojeIso, inicioDaSemana, somarDias } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { useSelector } from 'src/store/Store';

type Painel = { tipo: 'atendimento' | 'aluno' | 'profissional'; id: number } | null;

const CARGOS_VINCULADOS = ['PROFESSOR', 'PROFISSIONAL'];

/** Atendimentos: faixa da semana, presença em um clique e painel do item/aluno/profissional (old/js/19-atendimentos.js). */
const Atendimentos = () => {
  const { podeAlterar } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.ATENDIMENTO_ESCREVER);
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);
  const vinculado = !!usuario && CARGOS_VINCULADOS.includes(usuario.cargo.codigo);

  const [segunda, setSegunda] = useState(inicioDaSemana(hojeIso()));
  const [diaEscolhido, setDiaEscolhido] = useState<string | 'semana'>(hojeIso());
  const [busca, setBusca] = useState('');
  const [profissionalFiltro, setProfissionalFiltro] = useState<number | ''>('');
  const [soPendentes, setSoPendentes] = useState(false);
  const [painel, setPainel] = useState<Painel>(null);
  const [atendimentoAberto, setAtendimentoAberto] = useState<AtendimentoResposta | null>(null);

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [remarcando, setRemarcando] = useState<AtendimentoResposta | null>(null);
  const [justificando, setJustificando] = useState<AtendimentoResposta | null>(null);
  const [gestaoAberta, setGestaoAberta] = useState(false);
  const [listaPresencaAberta, setListaPresencaAberta] = useState(false);
  const [relatorio, setRelatorio] = useState<{ aberto: boolean; filtro: FiltroRelatorio | null }>({ aberto: false, filtro: null });

  const fim = somarDias(segunda, 6);
  const { dados, carregando, erro, recarregar } = useConsulta(() => servicoAtendimentos.itens(segunda, fim), [segunda, fim]);
  const { dados: alunos } = useConsulta(() => servicoAtendimentos.listarAlunos());
  const { dados: profissionais } = useConsulta(() => servicoAtendimentos.listarProfissionais());

  useEffect(() => {
    setPainel(null);
  }, [unidadeVisualizadaId]);

  // Se o dia escolhido saiu da semana carregada, volta para hoje ou o 1º dia.
  useEffect(() => {
    const datas = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
    if (diaEscolhido !== 'semana' && !datas.includes(diaEscolhido)) {
      setDiaEscolhido(datas.includes(hojeIso()) ? hojeIso() : datas[0]);
    }
  }, [segunda, diaEscolhido]);

  useEffect(() => {
    if (painel?.tipo !== 'atendimento') {
      setAtendimentoAberto(null);
      return;
    }
    let cancelado = false;
    servicoAtendimentos
      .detalhe(painel.id)
      .then((a) => !cancelado && setAtendimentoAberto(a))
      .catch((e) => {
        if (!cancelado) {
          notificar(mensagemDeErro(e), 'error');
          setPainel(null);
        }
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painel]);

  const filtrados = useMemo(
    () => (dados ?? []).filter((a) => combinaBusca(a, busca) && (!profissionalFiltro || a.profissionalId === profissionalFiltro) && (!soPendentes || (efetivo(a) && a.presenca === 'NAO_INFORMADO' && a.data < hojeIso()))),
    [dados, busca, profissionalFiltro, soPendentes],
  );
  const mapaPorDia = useMemo(() => porDia(filtrados), [filtrados]);
  const r = useMemo(() => resumo(dados ?? []), [dados]);

  const diasVisiveis = diaEscolhido === 'semana' ? Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)) : [diaEscolhido];
  const tituloSemana = `${dataPorExtenso(segunda)} a ${dataPorExtenso(fim)}`;

  const abrirAtendimento = (id: number, data?: string) => {
    if (data) setSegunda(inicioDaSemana(data));
    setPainel({ tipo: 'atendimento', id });
  };
  const abrirAluno = (id: number) => setPainel({ tipo: 'aluno', id });
  const abrirProfissional = (id: number) => setPainel({ tipo: 'profissional', id });

  const marcarPresenca = async (a: AtendimentoResposta, presenca: 'VEIO' | 'FALTOU') => {
    if (a.presenca === presenca) {
      try {
        await servicoAtendimentos.atualizarPresenca(a.id, { presenca: 'NAO_INFORMADO', faltaMotivo: '', faltaObservacao: '' });
        await recarregar();
      } catch (e) {
        notificar(mensagemDeErro(e), 'error');
      }
      return;
    }
    if (presenca === 'FALTOU') {
      setJustificando(a);
      return;
    }
    try {
      await servicoAtendimentos.atualizarPresenca(a.id, { presenca: 'VEIO', faltaMotivo: '', faltaObservacao: '' });
      await recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const confirmarFalta = async (motivo: Parameters<typeof servicoAtendimentos.atualizarPresenca>[1]['faltaMotivo'], observacao: string) => {
    if (!justificando) return;
    await servicoAtendimentos.atualizarPresenca(justificando.id, { presenca: 'FALTOU', faltaMotivo: motivo, faltaObservacao: observacao });
    setJustificando(null);
    await recarregar();
    notificar('Falta registrada.');
  };

  const excluirAtendimento = async () => {
    if (!atendimentoAberto) return;
    if (!(await confirmar(`Excluir o atendimento de "${atendimentoAberto.alunoNome}" em ${atendimentoAberto.data.split('-').reverse().join('/')} às ${atendimentoAberto.horario}?`, { rotuloConfirmar: 'Excluir' }))) return;
    try {
      await servicoAtendimentos.excluir(atendimentoAberto.id);
      notificar('Atendimento excluído.');
      setPainel(null);
      await recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const encerrarSerie = async () => {
    if (!atendimentoAberto) return;
    if (!(await confirmar(`Encerrar os atendimentos semanais de "${atendimentoAberto.alunoNome}" a partir de ${atendimentoAberto.data.split('-').reverse().join('/')}? Os atendimentos sem presença registrada serão removidos.`, { rotuloConfirmar: 'Encerrar' }))) return;
    try {
      const n = await servicoAtendimentos.encerrarSerie(atendimentoAberto.id);
      notificar(`✓ ${n} atendimento(s) removidos.`);
      abrirAluno(atendimentoAberto.alunoId);
      await recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const contatoFamilia = async (alunoId: number) => {
    try {
      await servicoAtendimentos.contatoFamilia(alunoId);
      notificar('✓ Anotado. O aviso volta só se houver falta nova.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return (
    <Pagina>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton aria-label="Semana anterior" onClick={() => { const n = somarDias(segunda, -7); setSegunda(n); setDiaEscolhido(n); }}>
            <IconChevronLeft size={20} />
          </IconButton>
          <Button variant="outlined" size="small" onClick={() => { const n = inicioDaSemana(hojeIso()); setSegunda(n); setDiaEscolhido(hojeIso()); }}>
            Esta semana
          </Button>
          <IconButton aria-label="Próxima semana" onClick={() => { const n = somarDias(segunda, 7); setSegunda(n); setDiaEscolhido(n); }}>
            <IconChevronRight size={20} />
          </IconButton>
          <Typography variant="h5" component="h2">
            {tituloSemana}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        {alterar ? (
          <Button
            size="small"
            variant="outlined"
            onClick={async () => {
              try {
                const n = await servicoAtendimentos.copiarSemanaAnterior(segunda);
                notificar(`✓ ${n} atendimento(s) copiados.`);
                await recarregar();
              } catch (e) {
                notificar(mensagemDeErro(e), 'error');
              }
            }}
          >
            Copiar semana anterior
          </Button>
        ) : null}
        <Button size="small" variant="outlined" startIcon={<IconPrinter size={16} />} onClick={() => setListaPresencaAberta(true)}>
          Lista de presença
        </Button>
        <Button size="small" variant="outlined" onClick={() => setRelatorio({ aberto: true, filtro: null })}>
          Relatório
        </Button>
        {!vinculado ? (
          <Button size="small" variant="outlined" onClick={() => setGestaoAberta(true)}>
            Alunos e profissionais
          </Button>
        ) : null}
      </Stack>

      {carregando && !dados ? <LinearProgress sx={{ mb: 2 }} /> : null}
      {erro ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" mb={1}>
        <Typography variant="body2">
          <strong>{r.total}</strong> atendimento{r.total === 1 ? '' : 's'} · <strong>{r.veio}</strong> vieram · <strong>{r.faltou}</strong> faltaram
          {r.semRegistro ? (
            <>
              {' '}
              · <strong>{r.semRegistro}</strong> sem registro
            </>
          ) : null}
        </Typography>
        {r.taxa !== null ? <Chip size="small" label={`Presença ${r.taxa}%`} /> : null}
      </Stack>
      {r.semRegistroPassado ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={() => setSoPendentes((v) => !v)}>
              {soPendentes ? 'Mostrar todos' : 'Mostrar só esses'}
            </Button>
          }
        >
          {r.semRegistroPassado} atendimento(s) de dias que já passaram sem presença marcada.
        </Alert>
      ) : r.total && !r.semRegistro ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Semana completa — todas as presenças registradas.
        </Alert>
      ) : null}

      <FaixaDias segunda={segunda} porDia={mapaPorDia} diaEscolhido={diaEscolhido} aoEscolher={setDiaEscolhido} />

      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
        <TextField type="search" size="small" placeholder="Buscar aluno, profissional ou observação…" value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ minWidth: 240 }} />
        {!vinculado && (profissionais ?? []).length ? (
          <CustomTextField select size="small" value={profissionalFiltro} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfissionalFiltro(e.target.value ? Number(e.target.value) : '')} sx={{ minWidth: 200 }}>
            <option value="">Todos os profissionais</option>
            {(profissionais ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </CustomTextField>
        ) : null}
        {alterar ? (
          <Button variant="contained" size="small" startIcon={<IconPlus size={16} />} onClick={() => setFormularioAberto(true)}>
            Adicionar
          </Button>
        ) : null}
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={painel ? 8 : 12}>
          <Box sx={{ opacity: carregando && dados ? 0.6 : 1, transition: 'opacity .2s' }}>
            {diasVisiveis.every((d) => !(mapaPorDia[d] ?? []).length) ? (
              <BlankCard>
                <Box p={4} textAlign="center">
                  <Typography color="textSecondary">
                    {busca || profissionalFiltro || soPendentes ? 'Nada com esses filtros neste período.' : 'Nenhum atendimento neste período.'}
                  </Typography>
                </Box>
              </BlankCard>
            ) : (
              diasVisiveis.map((d) => {
                const doDia = mapaPorDia[d] ?? [];
                if (!doDia.length && diaEscolhido === 'semana') return null;
                return (
                  <BlankCard key={d} sx={{ mb: 2 }}>
                    <Box p={1}>
                      {diaEscolhido === 'semana' ? (
                        <Typography variant="subtitle1" px={1.5} pt={1}>
                          {dataPorExtenso(d)}
                        </Typography>
                      ) : null}
                      {doDia.length ? (
                        doDia.map((a) => (
                          <LinhaAtendimento
                            key={a.id}
                            atendimento={a}
                            selecionado={painel?.tipo === 'atendimento' && painel.id === a.id}
                            podeAlterar={alterar}
                            aoAbrir={() => abrirAtendimento(a.id)}
                            aoMarcar={(p) => marcarPresenca(a, p)}
                          />
                        ))
                      ) : (
                        <Typography color="textSecondary" p={2} textAlign="center">
                          Nenhum atendimento neste dia.
                        </Typography>
                      )}
                    </Box>
                  </BlankCard>
                );
              })
            )}
          </Box>
        </Grid>
        {painel ? (
          <Grid item xs={12} lg={4}>
            <Box sx={{ position: { lg: 'sticky' }, top: { lg: 90 } }}>
              <BlankCard>
                <Box p={{ xs: 2, md: 3 }}>
                  {painel.tipo === 'atendimento' && atendimentoAberto ? (
                    <PainelAtendimento
                      atendimento={atendimentoAberto}
                      podeAlterar={alterar}
                      aoVoltar={() => setPainel(null)}
                      aoAbrirAluno={() => abrirAluno(atendimentoAberto.alunoId)}
                      aoAbrirProfissional={() => abrirProfissional(atendimentoAberto.profissionalId)}
                      aoAbrirOutroAtendimento={(id) => abrirAtendimento(id)}
                      aoRemarcar={() => setRemarcando(atendimentoAberto)}
                      aoExcluir={excluirAtendimento}
                      aoEncerrarSerie={encerrarSerie}
                    />
                  ) : null}
                  {painel.tipo === 'aluno' ? (
                    <PainelPessoa
                      tipo="aluno"
                      aluno={(alunos ?? []).find((a) => a.id === painel.id)}
                      podeAlterar={alterar}
                      aoVoltar={() => setPainel(null)}
                      aoAbrirAtendimento={(id) => abrirAtendimento(id)}
                      aoRelatorio={() => {
                        const aluno = (alunos ?? []).find((a) => a.id === painel.id);
                        if (aluno) setRelatorio({ aberto: true, filtro: { tipo: 'aluno', id: aluno.id, nome: aluno.nome } });
                      }}
                      aoContatoFamilia={() => contatoFamilia(painel.id)}
                    />
                  ) : null}
                  {painel.tipo === 'profissional' ? (
                    <PainelPessoa
                      tipo="profissional"
                      profissional={(profissionais ?? []).find((p) => p.id === painel.id)}
                      podeAlterar={alterar}
                      aoVoltar={() => setPainel(null)}
                      aoAbrirAtendimento={(id) => abrirAtendimento(id)}
                      aoRelatorio={() => {
                        const profissional = (profissionais ?? []).find((p) => p.id === painel.id);
                        if (profissional) setRelatorio({ aberto: true, filtro: { tipo: 'profissional', id: profissional.id, nome: profissional.nome } });
                      }}
                      aoContatoFamilia={() => Promise.resolve()}
                    />
                  ) : null}
                </Box>
              </BlankCard>
            </Box>
          </Grid>
        ) : null}
      </Grid>

      <FormularioNovoAtendimento
        aberto={formularioAberto}
        diaPadrao={diaEscolhido !== 'semana' ? diaEscolhido : segunda}
        segundaAtual={segunda}
        nomesAlunos={(alunos ?? []).map((a) => a.nome)}
        nomesProfissionais={(profissionais ?? []).map((p) => p.nome)}
        profissionalFixo={vinculado ? usuario?.nomeCompleto : undefined}
        aoFechar={() => setFormularioAberto(false)}
        aoCriar={async (r2) => {
          const a = await servicoAtendimentos.criar(r2);
          notificar(r2.semanal ? 'Atendimento semanal criado.' : 'Atendimento adicionado.');
          setSegunda(inicioDaSemana(a.data));
          setDiaEscolhido(a.data);
          await recarregar();
        }}
        aoCriarLote={async (r2) => {
          const n = await servicoAtendimentos.criarLote(r2);
          notificar(`✓ ${n} atendimento(s) adicionados${r2.semanal ? ', repetindo toda semana' : ''}.`);
          await recarregar();
        }}
      />

      <DialogoRemarcar
        atendimento={remarcando}
        profissionais={profissionais ?? []}
        podeEscolherProfissional={!vinculado}
        aoFechar={() => setRemarcando(null)}
        aoConfirmar={async (v) => {
          if (!remarcando) return;
          const novo = await servicoAtendimentos.remarcar(remarcando.id, { data: v.data, horario: v.horario, profissionalId: v.profissionalId, motivo: v.motivo });
          notificar('✓ Atendimento remarcado.');
          setRemarcando(null);
          setSegunda(inicioDaSemana(novo.data));
          setPainel({ tipo: 'atendimento', id: novo.id });
          await recarregar();
        }}
      />

      <DialogoJustificarFalta atendimento={justificando} aoFechar={() => setJustificando(null)} aoConfirmar={confirmarFalta} />

      <DialogoGestaoCadastros aberto={gestaoAberta} aoFechar={() => setGestaoAberta(false)} />

      <DialogoListaPresenca
        aberto={listaPresencaAberta}
        dia={diaEscolhido !== 'semana' ? diaEscolhido : null}
        segundaAtual={segunda}
        tituloSemana={tituloSemana}
        profissionais={profissionais ?? []}
        aoFechar={() => setListaPresencaAberta(false)}
      />

      <DialogoRelatorio
        aberto={relatorio.aberto}
        segundaAtual={segunda}
        filtro={relatorio.filtro}
        aoFechar={() => setRelatorio({ aberto: false, filtro: null })}
      />
    </Pagina>
  );
};

export default Atendimentos;

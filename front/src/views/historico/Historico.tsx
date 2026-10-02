import { useMemo, useState } from 'react';
import { Alert, Box, Button, CardContent, Chip, InputAdornment, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import Pagina from 'src/components/container/Pagina';
import BlankCard from 'src/components/shared/BlankCard';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoHistorico } from 'src/servicos/historico';
import type { HistoricoRegistro } from 'src/types/comum';
import { diasAte, doIso, hojeIso, paraIso, somarDias } from 'src/utils/datas';
import { normalizar } from 'src/utils/formatacao';
import { destinoDoHistorico, ROTULO_ACAO_HISTORICO, ROTULO_MODULO_HISTORICO } from 'src/utils/historico';

type Periodo = '1' | '7' | '30' | 'tudo' | 'dia';
const PERIODOS: [Periodo, string][] = [
  ['1', 'Hoje'],
  ['7', 'Últimos 7 dias'],
  ['30', 'Últimos 30 dias'],
  ['tudo', 'Tudo'],
  ['dia', 'Um dia específico…'],
];
const POR_PAGINA = 150;

/** Dia local (não UTC): uma ação às 22h continua no mesmo dia. */
const diaLocal = (instante: string) => paraIso(new Date(instante));
const hora = (instante: string) => new Date(instante).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function tituloDoDia(iso: string) {
  const d = diasAte(iso);
  if (d === 0) return 'Hoje';
  if (d === -1) return 'Ontem';
  const texto = doIso(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: iso.slice(0, 4) === hojeIso().slice(0, 4) ? undefined : 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Tudo o que foi feito no sistema, por dia (old: renderHistorico). Cada linha abre o registro, quando há tela. */
const Historico = () => {
  const navegar = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [dia, setDia] = useState(hojeIso());
  const [busca, setBusca] = useState('');
  const [modulo, setModulo] = useState('');
  const [acao, setAcao] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);

  // Intervalo [desde, ate) à meia-noite local; "tudo" começa em 2000.
  const [desde, ate] = useMemo(() => {
    const inicio = periodo === 'tudo' ? '2000-01-01' : periodo === 'dia' ? dia : somarDias(hojeIso(), -(Number(periodo) - 1));
    const fim = periodo === 'dia' ? somarDias(dia, 1) : somarDias(hojeIso(), 1);
    return [doIso(inicio), doIso(fim)];
  }, [periodo, dia]);

  const { dados, carregando, erro } = useConsulta(() => servicoHistorico.doPeriodo(desde, ate), [desde.getTime(), ate.getTime()]);

  const todos = useMemo(() => dados ?? [], [dados]);
  const q = normalizar(busca);
  const doPeriodo = useMemo(() => todos.filter((h) => (!acao || h.acao === acao) && (!q || normalizar(h.descricao).includes(q))), [todos, acao, q]);
  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    doPeriodo.forEach((h) => (c[h.modulo] = (c[h.modulo] ?? 0) + 1));
    return c;
  }, [doPeriodo]);
  const filtrados = modulo ? doPeriodo.filter((h) => h.modulo === modulo) : doPeriodo;
  const visiveis = filtrados.slice(0, limite);
  const acoes = [...new Set(todos.map((h) => h.acao))].sort((a, b) => (ROTULO_ACAO_HISTORICO[a] ?? a).localeCompare(ROTULO_ACAO_HISTORICO[b] ?? b, 'pt-BR'));

  const grupos = useMemo(() => {
    const lista: { dia: string; itens: HistoricoRegistro[]; total: number }[] = [];
    visiveis.forEach((h) => {
      const d = diaLocal(h.criadoEm);
      if (!lista.length || lista[lista.length - 1].dia !== d) lista.push({ dia: d, itens: [], total: 0 });
      lista[lista.length - 1].itens.push(h);
    });
    lista.forEach((g) => (g.total = filtrados.filter((h) => diaLocal(h.criadoEm) === g.dia).length));
    return lista;
  }, [visiveis, filtrados]);

  const filtrando = !!(busca || modulo || acao || periodo !== '30');
  const reiniciar = () => setLimite(POR_PAGINA);
  const limpar = () => {
    setBusca('');
    setModulo('');
    setAcao('');
    setPeriodo('30');
    reiniciar();
  };

  return (
    <Pagina>
      {erro ? <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert> : null}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2} alignItems={{ md: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar nas ações… (ex.: nome de aluno, documento, tarefa)"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            reiniciar();
          }}
          inputProps={{ 'aria-label': 'Buscar no histórico' }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>) }}
          sx={{ flex: 1, minWidth: { md: 280 } }}
        />
        <TextField select size="small" label="Período" value={periodo} onChange={(e) => { setPeriodo(e.target.value as Periodo); reiniciar(); }} sx={{ minWidth: 190 }}>
          {PERIODOS.map(([v, t]) => (<MenuItem key={v} value={v}>{t}</MenuItem>))}
        </TextField>
        {periodo === 'dia' ? (
          <TextField size="small" type="date" label="Dia" value={dia} onChange={(e) => { setDia(e.target.value || hojeIso()); reiniciar(); }} InputLabelProps={{ shrink: true }} inputProps={{ max: hojeIso() }} />
        ) : null}
        <TextField select size="small" label="Tipo de ação" value={acao} onChange={(e) => { setAcao(e.target.value); reiniciar(); }} sx={{ minWidth: 190 }} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
          <MenuItem value="">Todas as ações</MenuItem>
          {acoes.map((a) => (<MenuItem key={a} value={a}>{ROTULO_ACAO_HISTORICO[a] ?? a}</MenuItem>))}
        </TextField>
        {filtrando ? <Button size="small" onClick={limpar}>Limpar filtros</Button> : null}
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        <Chip label={`Tudo ${doPeriodo.length}`} color={modulo === '' ? 'primary' : 'default'} onClick={() => { setModulo(''); reiniciar(); }} />
        {Object.keys(ROTULO_MODULO_HISTORICO).filter((m) => contagem[m]).map((m) => (
          <Chip key={m} label={`${ROTULO_MODULO_HISTORICO[m]} ${contagem[m]}`} color={modulo === m ? 'primary' : 'default'} onClick={() => { setModulo(m); reiniciar(); }} />
        ))}
      </Stack>

      {carregando && !dados ? <LinearProgress /> : null}
      {dados && !grupos.length ? (
        <Alert severity="info">
          {todos.length ? 'Nenhuma ação com esses filtros.' : 'Nada registrado neste período. Cada vez que algo é criado, alterado, concluído ou excluído, aparece aqui.'}
          {periodo !== 'tudo' ? <Button size="small" sx={{ ml: 1 }} onClick={() => { setPeriodo('tudo'); reiniciar(); }}>Ver todo o período</Button> : null}
        </Alert>
      ) : null}

      {grupos.map((g) => (
        <BlankCard key={g.dia} sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography variant="h6">{tituloDoDia(g.dia)}</Typography>
              <Chip size="small" label={g.total} />
            </Stack>
            {g.itens.map((h) => {
              const destino = destinoDoHistorico(h);
              return (
                <Stack key={h.id} direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 0.75, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ minWidth: 42 }}>{hora(h.criadoEm)}</Typography>
                  <Chip size="small" variant="outlined" label={ROTULO_MODULO_HISTORICO[h.modulo] ?? h.modulo} sx={{ minWidth: 96 }} />
                  <Box flex={1} minWidth={0}>
                    {destino ? (
                      <Button size="small" color="inherit" endIcon={<IconArrowRight size={14} />} onClick={() => navegar(destino)} sx={{ textAlign: 'left', p: 0, justifyContent: 'flex-start', textTransform: 'none', fontWeight: 400 }}>
                        {h.descricao}
                      </Button>
                    ) : (
                      <Typography variant="body2">{h.descricao}</Typography>
                    )}
                    {h.usuarioNome ? <Typography variant="caption" color="textSecondary">{h.usuarioNome}</Typography> : null}
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>{ROTULO_ACAO_HISTORICO[h.acao] ?? h.acao}</Typography>
                </Stack>
              );
            })}
          </CardContent>
        </BlankCard>
      ))}

      {filtrados.length > visiveis.length ? (
        <Button variant="outlined" onClick={() => setLimite(limite + POR_PAGINA)}>
          Mostrar mais ({filtrados.length - visiveis.length} restantes)
        </Button>
      ) : null}
      {todos.length >= 1000 ? (
        <Typography variant="caption" color="textSecondary" display="block" mt={1}>
          Mostrando as 1.000 ações mais recentes do período; escolha um período menor para ver as mais antigas.
        </Typography>
      ) : null}
    </Pagina>
  );
};

export default Historico;

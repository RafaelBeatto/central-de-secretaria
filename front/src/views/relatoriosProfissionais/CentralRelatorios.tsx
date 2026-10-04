import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Grid, IconButton, InputAdornment, LinearProgress, ListItemButton, MenuItem, Stack, TextField, Theme, Typography, useMediaQuery } from '@mui/material';
import { IconArrowLeft, IconSearch, IconSend } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import ListaRelatorios from 'src/components/apps/relatoriosProfissionais/ListaRelatorios';
import DialogoCobrarRelatorio from 'src/components/apps/relatoriosProfissionais/DialogoCobrarRelatorio';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoRelatoriosProfissionais } from 'src/servicos/relatoriosProfissionais';
import { FiltrosCentral, ProfissionalCentral, ROTULO_STATUS_RELATORIO, StatusRelatorio } from 'src/types/relatoriosProfissionais';
import { anosParaFiltro } from 'src/utils/relatoriosProfissionais';
import { useSelector } from 'src/store/Store';

const SEM_FILTROS: FiltrosCentral = { busca: '', ano: '', de: '', ate: '', status: '' };
const ANOS = anosParaFiltro();

/** Central de Relatórios: professores e profissionais com a quantidade de relatórios; ao escolher um, os PDFs por ano e mês. */
const CentralRelatorios = () => {
  const { podeAlterar } = usePermissao();
  const { notificar } = useInteracao();
  const podeCobrar = podeAlterar(PERMISSOES.RELATORIO_PROF_COBRAR);
  const [cobrando, setCobrando] = useState<ProfissionalCentral | null>(null);
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);
  const [filtros, setFiltros] = useState<FiltrosCentral>(SEM_FILTROS);
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [selecionado, setSelecionado] = useState<ProfissionalCentral | null>(null);

  // A busca por nome espera uma pausa na digitação; os demais filtros valem na hora.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(filtros.busca), 300);
    return () => clearTimeout(t);
  }, [filtros.busca]);
  useEffect(() => setSelecionado(null), [unidadeVisualizadaId]);

  const { ano, de, ate, status } = filtros;
  const aplicados: FiltrosCentral = { busca: buscaAplicada, ano, de, ate, status };
  const { dados: profissionais, carregando, erro, recarregar: recarregarLista } = useConsulta(() => servicoRelatoriosProfissionais.profissionais(aplicados), [buscaAplicada, ano, de, ate, status]);
  const detalhe = useConsulta(
    () => (selecionado ? servicoRelatoriosProfissionais.doProfissional(selecionado.usuarioId, aplicados) : Promise.resolve(undefined)),
    [selecionado?.usuarioId, ano, de, ate, status],
  );

  const filtrando = JSON.stringify(filtros) !== JSON.stringify(SEM_FILTROS);
  const mudar = (campo: Partial<FiltrosCentral>) => setFiltros({ ...filtros, ...campo });
  const periodoInvalido = !!de && !!ate && ate < de;

  const lista = (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={1.5} flexWrap="wrap" useFlexGap>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar professor ou profissional…"
          value={filtros.busca}
          onChange={(e) => mudar({ busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar profissional' }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>) }}
          sx={{ flexGrow: 1, minWidth: 240 }}
        />
        <TextField select size="small" label="Ano" value={ano} onChange={(e) => mudar({ ano: e.target.value })} sx={{ minWidth: 120 }} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
          <MenuItem value="">Todos</MenuItem>
          {ANOS.map((a) => (<MenuItem key={a} value={String(a)}>{a}</MenuItem>))}
        </TextField>
        <TextField select size="small" label="Status" value={status} onChange={(e) => mudar({ status: e.target.value as FiltrosCentral['status'] })} sx={{ minWidth: 140 }} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
          <MenuItem value="">Todos</MenuItem>
          {(Object.keys(ROTULO_STATUS_RELATORIO) as StatusRelatorio[]).map((s) => (<MenuItem key={s} value={s}>{ROTULO_STATUS_RELATORIO[s]}</MenuItem>))}
        </TextField>
        <TextField size="small" type="date" label="Período: de" value={de} onChange={(e) => mudar({ de: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Período: até" value={ate} onChange={(e) => mudar({ ate: e.target.value })} InputLabelProps={{ shrink: true }} error={periodoInvalido} helperText={periodoInvalido ? 'Antes do início' : undefined} />
        {filtrando ? <Button size="small" onClick={() => setFiltros(SEM_FILTROS)}>Limpar filtros</Button> : null}
      </Stack>

      {carregando && !profissionais ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {profissionais && !profissionais.length ? (
        <Typography color="textSecondary" py={3} textAlign="center">
          {filtrando ? 'Nenhum professor ou profissional com esses filtros.' : 'Nenhum professor ou profissional cadastrado nesta unidade.'}
        </Typography>
      ) : null}
      {(profissionais ?? []).map((p) => (
        <ListItemButton key={p.usuarioId} selected={selecionado?.usuarioId === p.usuarioId} onClick={() => setSelecionado(selecionado?.usuarioId === p.usuarioId && !celular ? null : p)} sx={{ borderRadius: 1, py: 1.25, px: 1.5 }}>
          <Box flexGrow={1} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={500} noWrap>{p.nome}</Typography>
            <Typography variant="caption" color="textSecondary">{p.cargo}</Typography>
          </Box>
          {p.pendentes ? <Chip size="small" color="warning" label={`${p.pendentes} ${p.pendentes === 1 ? 'pendente' : 'pendentes'}`} sx={{ ml: 1, flexShrink: 0 }} /> : null}
          <Chip size="small" color={p.total ? 'primary' : 'default'} label={`${p.total} ${p.total === 1 ? 'relatório' : 'relatórios'}`} sx={{ ml: 1, flexShrink: 0 }} />
        </ListItemButton>
      ))}
    </>
  );

  const painel = selecionado ? (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          {celular ? (
            <IconButton aria-label="Voltar à lista" size="small" onClick={() => setSelecionado(null)}>
              <IconArrowLeft size={18} />
            </IconButton>
          ) : null}
          <Box minWidth={0} flexGrow={1}>
            <Typography variant="h5" noWrap>{selecionado.nome}</Typography>
            <Typography variant="body2" color="textSecondary">{selecionado.cargo} · Relatórios</Typography>
          </Box>
          {podeCobrar ? (
            <Button variant="outlined" size="small" startIcon={<IconSend size={16} />} onClick={() => setCobrando(selecionado)} sx={{ flexShrink: 0 }}>
              Cobrar relatório
            </Button>
          ) : null}
        </Stack>
        {detalhe.carregando && !detalhe.dados ? <LinearProgress /> : null}
        {detalhe.erro ? <Alert severity="error">{detalhe.erro}</Alert> : null}
        {detalhe.dados ? <ListaRelatorios relatorios={detalhe.dados} vazio={filtrando ? 'Nenhum relatório com esses filtros.' : 'Nenhum relatório enviado ainda.'} /> : null}
      </CardContent>
    </Card>
  ) : null;

  return (
    <Pagina>
      {celular && painel ? (
        painel
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={painel ? 5 : 12} lg={painel ? 5 : 12}>{lista}</Grid>
          {painel ? (
            <Grid item xs={12} md={7} lg={7}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 90 } }}>{painel}</Box>
            </Grid>
          ) : null}
        </Grid>
      )}
      <DialogoCobrarRelatorio
        profissional={cobrando}
        aoFechar={() => setCobrando(null)}
        aoCobrar={(r) => {
          notificar(`Relatório cobrado de ${r.nomeUsuario}.`);
          recarregarLista();
          detalhe.recarregar();
        }}
      />
    </Pagina>
  );
};

export default CentralRelatorios;

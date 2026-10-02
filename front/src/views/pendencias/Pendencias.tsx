import { useMemo, useState } from 'react';
import { Alert, Box, CardContent, Chip, InputAdornment, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import BlankCard from 'src/components/shared/BlankCard';
import SecoesPendencias from 'src/components/apps/pendencias/SecoesPendencias';
import { useDadosPainel } from 'src/hooks/useDadosPainel';
import { normalizar } from 'src/utils/formatacao';
import { montarPendencias, ORIGENS_PENDENCIA, OrigemPendencia, porCategoria, SECOES_PENDENCIA } from 'src/utils/pendencias';

/** Tudo que espera pelo usuário, com a ação ali mesmo (old: renderPendencias). */
const Pendencias = () => {
  const { dados, carregando, erro, recarregar } = useDadosPainel();
  const [origem, setOrigem] = useState<OrigemPendencia | ''>('');
  const [busca, setBusca] = useState('');

  const todas = useMemo(() => (dados ? montarPendencias(dados) : []), [dados]);
  const visiveis = useMemo(() => {
    const q = normalizar(busca);
    return todas.filter((p) => (!origem || p.origem === origem) && (!q || normalizar(`${p.titulo} ${p.descricao}`).includes(q)));
  }, [todas, origem, busca]);

  const contagem = (o: OrigemPendencia) => todas.filter((p) => p.origem === o).length;
  const grupos = porCategoria(visiveis);
  const resumo = SECOES_PENDENCIA.filter((s) => grupos[s.categoria].length)
    .map((s) => `${grupos[s.categoria].length} ${s.titulo.toLowerCase()}`)
    .join(' · ');

  return (
    <Pagina>
      {erro ? <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert> : null}
      {carregando && !dados ? <LinearProgress /> : null}
      {dados && !todas.length ? (
        <Alert severity="success">
          <strong>Nada pendente.</strong> Nenhuma tarefa atrasada, documento vencendo, atendimento sem presença ou etapa de projeto esperando.
        </Alert>
      ) : null}
      {todas.length ? (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} mb={2}>
            <TextField
              size="small"
              placeholder="Buscar…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              inputProps={{ 'aria-label': 'Buscar pendência' }}
              InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>) }}
              sx={{ minWidth: { md: 280 } }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Tudo ${todas.length}`} color={origem === '' ? 'primary' : 'default'} onClick={() => setOrigem('')} />
              {ORIGENS_PENDENCIA.filter(([o]) => contagem(o)).map(([o, rotulo]) => (
                <Chip key={o} label={`${rotulo} ${contagem(o)}`} color={origem === o ? 'primary' : 'default'} onClick={() => setOrigem(o)} />
              ))}
            </Stack>
          </Stack>
          <Typography color="textSecondary" mb={2}>
            {resumo || 'Nada com esses filtros.'}
          </Typography>
          <BlankCard>
            <CardContent>
              <Box>
                <SecoesPendencias pendencias={visiveis} comDicas maxAtendimentos={8} aoMudar={recarregar} />
              </Box>
            </CardContent>
          </BlankCard>
        </>
      ) : null}
    </Pagina>
  );
};

export default Pendencias;

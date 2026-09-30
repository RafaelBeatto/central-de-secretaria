import { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Divider, Grid, IconButton, LinearProgress, List, ListItemButton, Stack, Typography } from '@mui/material';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoAtendimentos } from 'src/servicos/atendimentos';
import type { AlunoAtendimento, ProfissionalAtendimento } from 'src/types/atendimentos';
import { ROTULO_MOTIVO_FALTA, ROTULO_PRESENCA } from 'src/types/atendimentos';
import { faltasSeguidas, precisaAvisarFaltas, resumo } from 'src/utils/atendimentos';
import { formatarData } from 'src/utils/formatacao';

interface Props {
  tipo: 'aluno' | 'profissional';
  aluno?: AlunoAtendimento;
  profissional?: ProfissionalAtendimento;
  podeAlterar: boolean;
  aoVoltar: () => void;
  aoAbrirAtendimento: (id: number) => void;
  aoRelatorio: () => void;
  aoContatoFamilia: () => Promise<unknown>;
}

/** Ficha do aluno ou do profissional: histórico, resumo e faltas seguidas (old: atPainelHTML). */
const PainelPessoa = ({ tipo, aluno, profissional, podeAlterar, aoVoltar, aoAbrirAtendimento, aoRelatorio, aoContatoFamilia }: Props) => {
  const id = (tipo === 'aluno' ? aluno?.id : profissional?.id) ?? 0;
  const nome = (tipo === 'aluno' ? aluno?.nome : profissional?.nome) ?? '';
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const { dados, carregando, erro } = useConsulta(
    () => (tipo === 'aluno' ? servicoAtendimentos.historicoDoAluno(id) : servicoAtendimentos.historicoDoProfissional(id)),
    [tipo, id],
  );

  const filtrada = useMemo(() => (dados ?? []).filter((a) => (!de || a.data >= de) && (!ate || a.data <= ate)), [dados, de, ate]);
  const r = useMemo(() => resumo(filtrada), [filtrada]);
  const motivos = useMemo(() => {
    const contagem: Record<string, number> = {};
    filtrada.forEach((a) => {
      if (a.presenca === 'FALTOU' && !a.remarcado) {
        const m = a.faltaMotivo ? ROTULO_MOTIVO_FALTA[a.faltaMotivo] : 'Sem motivo';
        contagem[m] = (contagem[m] ?? 0) + 1;
      }
    });
    return Object.entries(contagem).sort((x, y) => y[1] - x[1]);
  }, [filtrada]);

  const fs = tipo === 'aluno' && dados ? faltasSeguidas(dados) : null;
  const avisarFaltas = tipo === 'aluno' && fs && aluno ? precisaAvisarFaltas(fs, aluno.faltasContatoAte) : false;
  const extra =
    tipo === 'aluno'
      ? `Atende com: ${[...new Set((dados ?? []).map((a) => a.profissionalNome))].join(', ') || '—'}`
      : `${new Set((dados ?? []).map((a) => a.alunoId)).size} aluno(s) atendido(s)`;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={aoVoltar} sx={{ display: { md: 'none' } }}>
          Atendimentos
        </Button>
        <Box flex={1} />
        <IconButton size="small" aria-label="Fechar" onClick={aoVoltar}>
          <IconX size={18} />
        </IconButton>
      </Stack>

      <Typography variant="overline" color="textSecondary">
        {tipo === 'aluno' ? 'Aluno' : 'Profissional'}
      </Typography>
      <Typography variant="h5">{nome}</Typography>
      <Typography variant="body2" color="textSecondary" mb={1}>
        {extra}
      </Typography>

      {avisarFaltas && fs ? (
        <Alert severity="warning" sx={{ mb: 2 }} action={podeAlterar ? <Button size="small" onClick={aoContatoFamilia}>Família contatada</Button> : undefined}>
          {fs.quantidade} faltas seguidas desde {formatarData(fs.desde)}
          {fs.motivos.length ? ` (${fs.motivos.map((m) => ROTULO_MOTIVO_FALTA[m]).join(', ')})` : ''}.
        </Alert>
      ) : null}

      <Button size="small" variant="outlined" onClick={aoRelatorio} sx={{ mb: 2 }}>
        Relatório em PDF
      </Button>

      <Grid container spacing={1} mb={1}>
        <Grid item xs={6}>
          <CustomTextField label="De" type="date" size="small" fullWidth value={de} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDe(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={6}>
          <CustomTextField label="Até" type="date" size="small" fullWidth value={ate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAte(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
      </Grid>

      {carregando ? <LinearProgress sx={{ mb: 1 }} /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}

      <Stack direction="row" spacing={2} flexWrap="wrap" mb={1}>
        <Typography variant="body2">
          <strong>{r.total}</strong> atendimento{r.total === 1 ? '' : 's'}
        </Typography>
        <Typography variant="body2">
          <strong>{r.veio}</strong> vieram
        </Typography>
        <Typography variant="body2">
          <strong>{r.faltou}</strong> faltaram
        </Typography>
        {r.taxa !== null ? <Chip size="small" label={`Presença ${r.taxa}%`} /> : null}
      </Stack>
      {motivos.length ? (
        <Typography variant="caption" color="textSecondary" component="div" mb={1}>
          Faltas: {motivos.map(([m, n]) => `${m} (${n})`).join(' · ')}
        </Typography>
      ) : null}

      <Divider sx={{ my: 1.5 }} />

      <List dense disablePadding>
        {filtrada.length === 0 ? (
          <Typography variant="body2" color="textSecondary" py={2} textAlign="center">
            Nenhum atendimento no período.
          </Typography>
        ) : (
          filtrada.slice(0, 80).map((a) => (
            <ListItemButton key={a.id} onClick={() => aoAbrirAtendimento(a.id)} sx={{ borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" width="100%" spacing={1}>
                <Typography variant="body2" noWrap>
                  {formatarData(a.data).slice(0, 5)} {a.horario} ·{' '}
                  <Box component="span" color="text.secondary">
                    {tipo === 'aluno' ? a.profissionalNome : a.alunoNome}
                  </Box>
                </Typography>
                <Typography variant="caption" color="textSecondary" whiteSpace="nowrap">
                  {a.remarcado ? 'Remarcado' : ROTULO_PRESENCA[a.presenca]}
                </Typography>
              </Stack>
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  );
};

export default PainelPessoa;

import { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  Theme,
} from '@mui/material';
import { IconTrash, IconX } from '@tabler/icons-react';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { LIMITES } from 'src/constantes/limites';
import type { LinhaLoteAtendimento, RequisicaoAtendimentoLote, RequisicaoNovoAtendimento } from 'src/types/atendimentos';
import { somarDias } from 'src/utils/datas';
import { ErroApi } from 'src/utils/erroApi';

interface Props {
  aberto: boolean;
  diaPadrao: string;
  segundaAtual: string;
  nomesAlunos: string[];
  nomesProfissionais: string[];
  profissionalFixo?: string;
  aoFechar: () => void;
  aoCriar: (r: RequisicaoNovoAtendimento) => Promise<unknown>;
  aoCriarLote: (r: RequisicaoAtendimentoLote) => Promise<unknown>;
}

const fimDoAno = (iso: string) => `${iso.slice(0, 4)}-12-31`;
const linhaVazia = (dia: string): LinhaLoteAtendimento => ({ alunoNome: '', profissionalNome: '', data: dia, horario: '' });

/** Um atendimento novo (avulso ou semanal) ou vários de uma vez (old: abrirModalNovoAtendimento). */
const FormularioNovoAtendimento = ({
  aberto,
  diaPadrao,
  segundaAtual,
  nomesAlunos,
  nomesProfissionais,
  profissionalFixo,
  aoFechar,
  aoCriar,
  aoCriarLote,
}: Props) => {
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const [aba, setAba] = useState<'individual' | 'lote'>('individual');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [alunoNome, setAlunoNome] = useState('');
  const [profissionalNome, setProfissionalNome] = useState(profissionalFixo ?? '');
  const [data, setData] = useState(diaPadrao);
  const [horario, setHorario] = useState('');
  const [observacao, setObservacao] = useState('');
  const [semanal, setSemanal] = useState(false);
  const [repetirAte, setRepetirAte] = useState(fimDoAno(diaPadrao));

  const diasDaSemana = Array.from({ length: 6 }, (_, i) => somarDias(segundaAtual, i));
  const [loteSemanal, setLoteSemanal] = useState(false);
  const [linhas, setLinhas] = useState<LinhaLoteAtendimento[]>([linhaVazia(diaPadrao), linhaVazia(diaPadrao), linhaVazia(diaPadrao)]);

  const fechar = () => {
    setErro(null);
    aoFechar();
  };

  const enviarIndividual = async () => {
    if (!alunoNome.trim() || !profissionalNome.trim() || !data || !horario) {
      setErro('Preencha aluno, profissional, data e horário.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await aoCriar({
        alunoNome: alunoNome.trim(),
        profissionalNome: profissionalNome.trim(),
        data,
        horario,
        observacao: observacao.trim(),
        semanal,
        repetirAte: semanal ? repetirAte : '',
      });
      fechar();
    } catch (e) {
      setErro(ErroApi.de(e).message);
    } finally {
      setEnviando(false);
    }
  };

  const enviarLote = async () => {
    const completas = linhas.filter((l) => l.alunoNome.trim() && (profissionalFixo || l.profissionalNome.trim()) && l.horario);
    if (!completas.length) {
      setErro('Preencha ao menos uma linha completa (aluno, profissional e horário).');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await aoCriarLote({ semanal: loteSemanal, linhas: completas });
      fechar();
    } catch (e) {
      setErro(ErroApi.de(e).message);
    } finally {
      setEnviando(false);
    }
  };

  const mudarLinha = (i: number, campo: keyof LinhaLoteAtendimento, valor: string) =>
    setLinhas((atual) => atual.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));

  return (
    <Dialog open={aberto} onClose={fechar} fullWidth maxWidth="sm" fullScreen={celular} scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        Novo atendimento
        <IconButton aria-label="Fechar" onClick={fechar} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <IconX size={20} />
        </IconButton>
      </DialogTitle>
      <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ px: 3 }}>
        <Tab value="individual" label="Um atendimento" />
        <Tab value="lote" label="Vários de uma vez" />
      </Tabs>
      <DialogContent dividers>
        {erro ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        ) : null}

        {aba === 'individual' ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={nomesAlunos}
                inputValue={alunoNome}
                onInputChange={(_, v) => setAlunoNome(v)}
                renderInput={(params) => <CustomTextField {...params} label="Aluno *" fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {profissionalFixo ? (
                <CustomTextField label="Profissional" value={profissionalFixo} fullWidth disabled />
              ) : (
                <Autocomplete
                  freeSolo
                  options={nomesProfissionais}
                  inputValue={profissionalNome}
                  onInputChange={(_, v) => setProfissionalNome(v)}
                  renderInput={(params) => <CustomTextField {...params} label="Profissional *" fullWidth />}
                />
              )}
            </Grid>
            <Grid item xs={6}>
              <CustomTextField label="Data *" type="date" fullWidth value={data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <CustomTextField label="Horário *" type="time" fullWidth value={horario} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHorario(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox checked={semanal} onChange={(e) => setSemanal(e.target.checked)} />} label="Repete toda semana" />
            </Grid>
            {semanal ? (
              <Grid item xs={12} sm={6}>
                <CustomTextField label="Até" type="date" fullWidth value={repetirAte} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepetirAte(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
            ) : null}
            <Grid item xs={12}>
              <CustomTextField
                label="Observação"
                fullWidth
                multiline
                minRows={2}
                value={observacao}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObservacao(e.target.value)}
                inputProps={{ maxLength: LIMITES.OBSERVACAO_CURTA }}
              />
            </Grid>
          </Grid>
        ) : (
          <Box>
            <Typography variant="body2" color="textSecondary" mb={2}>
              Uma linha por atendimento, na semana atual. Linhas incompletas são ignoradas.
            </Typography>
            <Stack spacing={1.5} mb={2}>
              {linhas.map((l, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <Autocomplete
                    freeSolo
                    options={nomesAlunos}
                    inputValue={l.alunoNome}
                    onInputChange={(_, v) => mudarLinha(i, 'alunoNome', v)}
                    sx={{ flex: 1 }}
                    renderInput={(params) => <CustomTextField {...params} label="Aluno" size="small" fullWidth />}
                  />
                  {!profissionalFixo ? (
                    <Autocomplete
                      freeSolo
                      options={nomesProfissionais}
                      inputValue={l.profissionalNome}
                      onInputChange={(_, v) => mudarLinha(i, 'profissionalNome', v)}
                      sx={{ flex: 1 }}
                      renderInput={(params) => <CustomTextField {...params} label="Profissional" size="small" fullWidth />}
                    />
                  ) : null}
                  <TextField
                    select
                    size="small"
                    label="Dia"
                    value={l.data}
                    onChange={(e) => mudarLinha(i, 'data', e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{ minWidth: 110 }}
                  >
                    {diasDaSemana.map((d) => (
                      <option key={d} value={d}>
                        {d.slice(8, 10)}/{d.slice(5, 7)}
                      </option>
                    ))}
                  </TextField>
                  <CustomTextField
                    type="time"
                    size="small"
                    label="Horário"
                    value={l.horario}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => mudarLinha(i, 'horario', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 120 }}
                  />
                  <IconButton size="small" aria-label="Remover linha" onClick={() => setLinhas((atual) => atual.filter((_, idx) => idx !== i))}>
                    <IconTrash size={16} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button size="small" onClick={() => setLinhas((atual) => [...atual, linhaVazia(diaPadrao)])}>
              + Linha
            </Button>
            <FormControlLabel
              sx={{ display: 'block', mt: 1 }}
              control={<Checkbox checked={loteSemanal} onChange={(e) => setLoteSemanal(e.target.checked)} />}
              label={`Repetir toda semana até ${fimDoAno(segundaAtual).split('-').reverse().join('/')}`}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={fechar} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" disabled={enviando} onClick={aba === 'individual' ? enviarIndividual : enviarLote}>
          {enviando ? 'Salvando…' : 'Adicionar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormularioNovoAtendimento;

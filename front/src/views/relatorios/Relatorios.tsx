import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { IconDownload, IconPrinter } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import PaginaA4Previa from 'src/components/apps/gerador/PaginaA4Previa';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoRelatorios } from 'src/servicos/relatorios';
import { servicoUnidades } from 'src/servicos/unidades';
import { SECOES_RELATORIO, SecaoRelatorio } from 'src/types/relatorios';
import { mensagemDeErro } from 'src/utils/erroApi';
import { imprimir, salvarPdf } from 'src/utils/impressaoPdf';
import { intervaloDoPeriodo, montarHtmlRelatorio, PERIODOS_RELATORIO, PeriodoRelatorio } from 'src/utils/relatorioAtividades';

/** Relatório de atividades do período: a prévia é exatamente o que vai para a impressão e o PDF. */
const Relatorios = () => {
  const { notificar } = useInteracao();
  const [periodo, setPeriodo] = useState<PeriodoRelatorio>('mes');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [secoes, setSecoes] = useState<SecaoRelatorio[]>(SECOES_RELATORIO.map(([k]) => k));
  const [intervaloDe, intervaloAte] = intervaloDoPeriodo(periodo, de, ate);
  const intervaloValido = intervaloDe <= intervaloAte;

  // Cabeçalho da unidade (com o logo do S3, se houver) — carregado uma vez.
  const { dados: cabecalho } = useConsulta(async () => {
    const unidade = await servicoUnidades.atual();
    const logoUrl = unidade.logoArquivoId ? await servicoArquivos.url(unidade.logoArquivoId).catch(() => null) : null;
    return { unidade, logoUrl };
  });

  const { dados, carregando, erro } = useConsulta(
    () => (intervaloValido && secoes.length ? servicoRelatorios.atividades(intervaloDe, intervaloAte, secoes) : Promise.resolve(null)),
    [intervaloDe, intervaloAte, secoes.join(',')],
  );

  const html = useMemo(
    () => (dados && cabecalho ? montarHtmlRelatorio(dados, cabecalho.unidade, cabecalho.logoUrl) : ''),
    [dados, cabecalho],
  );
  const nomeArquivo = `Relatorio_Atividades_${intervaloDe}_a_${intervaloAte}`;

  useEffect(() => {
    // Ao escolher "Escolher…" começa do período que já estava na tela.
    if (periodo === 'custom' && !de) {
      setDe(intervaloDe);
      setAte(intervaloAte);
    }
  }, [periodo, de, intervaloDe, intervaloAte]);

  const escolherPeriodo = (p: PeriodoRelatorio) => {
    if (p === 'custom') {
      setDe(intervaloDe);
      setAte(intervaloAte);
    }
    setPeriodo(p);
  };
  const alternar = (k: SecaoRelatorio) => setSecoes((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const acao = async (fazer: () => void | Promise<void>) => {
    try {
      await fazer();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return (
    <Pagina>
      <Stack spacing={2} mb={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <Typography variant="subtitle2" sx={{ minWidth: 64 }}>Período</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {PERIODOS_RELATORIO.map(([v, t]) => (
              <Chip key={v} label={t} color={periodo === v ? 'primary' : 'default'} onClick={() => escolherPeriodo(v)} />
            ))}
          </Stack>
          {periodo === 'custom' ? (
            <Stack direction="row" spacing={1}>
              <TextField size="small" type="date" label="De" value={de} onChange={(ev) => setDe(ev.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField size="small" type="date" label="Até" value={ate} onChange={(ev) => setAte(ev.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>
          ) : null}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <Typography variant="subtitle2" sx={{ minWidth: 64 }}>Incluir</Typography>
          <Stack direction="row" flexWrap="wrap">
            {SECOES_RELATORIO.map(([k, t]) => (
              <FormControlLabel key={k} control={<Checkbox size="small" checked={secoes.includes(k)} onChange={() => alternar(k)} />} label={t} />
            ))}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<IconDownload size={18} />} disabled={!html} onClick={() => acao(() => salvarPdf(html, nomeArquivo))}>
            Salvar PDF
          </Button>
          <Button variant="outlined" startIcon={<IconPrinter size={18} />} disabled={!html} onClick={() => acao(() => imprimir(html, nomeArquivo))}>
            Imprimir
          </Button>
        </Stack>
      </Stack>

      {!intervaloValido ? <Alert severity="warning">A data inicial é depois da data final.</Alert> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {carregando ? <LinearProgress sx={{ mb: 2 }} /> : null}
      {!secoes.length ? <Alert severity="info">Escolha ao menos uma área para o relatório.</Alert> : null}
      {html ? (
        <Box sx={{ bgcolor: 'action.hover', p: { xs: 1, md: 2 }, borderRadius: 1 }}>
          <PaginaA4Previa html={html} />
        </Box>
      ) : null}
    </Pagina>
  );
};

export default Relatorios;

import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack } from '@mui/material';
import { IconPrinter } from '@tabler/icons-react';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoAtendimentos } from 'src/servicos/atendimentos';
import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoUnidades } from 'src/servicos/unidades';
import type { AtendimentoResposta } from 'src/types/atendimentos';
import { ROTULO_MOTIVO_FALTA, ROTULO_PRESENCA } from 'src/types/atendimentos';
import { efetivo, resumo } from 'src/utils/atendimentos';
import { hojeIso, somarDias, somarMeses } from 'src/utils/datas';
import { formatarData } from 'src/utils/formatacao';
import { cabecalhoInstitucionalHtml, paginaA4 } from 'src/utils/documentoA4';
import { imprimir, salvarPdf } from 'src/utils/impressaoPdf';
import { mensagemDeErro } from 'src/utils/erroApi';

export interface FiltroRelatorio {
  tipo: 'aluno' | 'profissional';
  id: number;
  nome: string;
}

interface Props {
  aberto: boolean;
  segundaAtual: string;
  filtro: FiltroRelatorio | null;
  aoFechar: () => void;
}

const hoje = hojeIso();
const iniMes = somarMeses(hoje, 0);
const fimMes = somarDias(somarMeses(hoje, 1), -1);
const iniMesAnt = somarMeses(hoje, -1);
const fimMesAnt = somarDias(iniMes, -1);

async function buscar(de: string, ate: string, filtro: FiltroRelatorio | null): Promise<AtendimentoResposta[]> {
  const todos = await servicoAtendimentos.itens(de, ate);
  return todos
    .filter((a) => efetivo(a) && (!filtro || (filtro.tipo === 'aluno' ? a.alunoId === filtro.id : a.profissionalId === filtro.id)))
    .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`));
}

async function montarHtml(de: string, ate: string, filtro: FiltroRelatorio | null) {
  const todos = await buscar(de, ate, filtro);
  const r = resumo(todos);
  const unidade = await servicoUnidades.atual();
  const logoUrl = unidade.logoArquivoId ? await servicoArquivos.url(unidade.logoArquivoId).catch(() => null) : null;
  const cabecalho = cabecalhoInstitucionalHtml(unidade, logoUrl);

  const porProfissional: Record<string, { total: number; veio: number; faltou: number }> = {};
  todos.forEach((a) => {
    const s = (porProfissional[a.profissionalNome] ??= { total: 0, veio: 0, faltou: 0 });
    s.total++;
    if (a.presenca === 'VEIO') s.veio++;
    if (a.presenca === 'FALTOU') s.faltou++;
  });
  const motivos: Record<string, number> = {};
  todos.filter((a) => a.presenca === 'FALTOU').forEach((a) => {
    const m = a.faltaMotivo ? ROTULO_MOTIVO_FALTA[a.faltaMotivo] : 'Sem motivo';
    motivos[m] = (motivos[m] ?? 0) + 1;
  });

  const th = (t: string) => `<th style="text-align:left;padding:4px">${t}</th>`;
  const td = (t: string) => `<td style="padding:4px">${t}</td>`;

  return paginaA4(`${cabecalho}
    <div class="doc-a4-titulo">RELATÓRIO DE ATENDIMENTOS</div>
    <p style="text-align:center;font-size:11pt;margin-bottom:20px">${filtro ? `${filtro.tipo === 'aluno' ? 'Aluno' : 'Profissional'}: ${filtro.nome} · ` : ''}Período: ${formatarData(de)} a ${formatarData(ate)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:10pt"><thead><tr style="border-bottom:1.5px solid #000">${th('Data')}${th('Horário')}${th('Aluno')}${th('Profissional')}${th('Presença')}${th('Observação')}</tr></thead>
    <tbody>${
      todos
        .map(
          (a) =>
            `<tr style="border-bottom:1px solid #ccc">${td(formatarData(a.data))}${td(a.horario)}${td(a.alunoNome)}${td(a.profissionalNome)}${td(
              ROTULO_PRESENCA[a.presenca] + (a.presenca === 'FALTOU' && a.faltaMotivo ? ` (${ROTULO_MOTIVO_FALTA[a.faltaMotivo]})` : ''),
            )}${td([a.remarcadoDeId ? 'Remarcado' : null, a.observacao].filter(Boolean).join(' · '))}</tr>`,
        )
        .join('') || '<tr><td colspan="6" style="padding:8px">Nenhum atendimento no período.</td></tr>'
    }</tbody></table>
    <div style="margin-top:24px;font-size:11pt"><strong>RESUMO</strong><br>
      Atendimentos: ${r.total}<br>Vieram: ${r.veio}<br>Faltaram: ${r.faltou}<br>Sem registro: ${r.semRegistro}<br>
      Presença: ${r.taxa === null ? '—' : `${r.taxa}%`} <span style="font-size:9pt">(vieram ÷ vieram + faltaram)</span>
      ${Object.keys(motivos).length ? `<br>Motivos das faltas: ${Object.entries(motivos).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} (${n})`).join('; ')}` : ''}</div>
    ${
      filtro?.tipo !== 'profissional' && Object.keys(porProfissional).length > 1
        ? `<div style="margin-top:16px;font-size:11pt"><strong>POR PROFISSIONAL</strong>
      <table style="width:100%;border-collapse:collapse;margin-top:6px"><thead><tr style="border-bottom:1px solid #000">${th('Profissional')}${th('Atendimentos')}${th('Vieram')}${th('Faltaram')}</tr></thead>
      <tbody>${Object.entries(porProfissional)
        .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
        .map(([n, s]) => `<tr>${td(n)}${td(String(s.total))}${td(String(s.veio))}${td(String(s.faltou))}</tr>`)
        .join('')}</tbody></table></div>`
        : ''
    }
    <div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_________________________</div><div>Responsável pelo relatório</div></div>
    <div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_________________________</div><div>Data: ___/___/______</div></div>`);
}

/** Período livre ou por atalho, geral ou filtrado por aluno/profissional (old: abrirRelatorioAtendimentos). */
const DialogoRelatorio = ({ aberto, segundaAtual, filtro, aoFechar }: Props) => {
  const { notificar } = useInteracao();
  const [de, setDe] = useState(segundaAtual);
  const [ate, setAte] = useState(somarDias(segundaAtual, 6));
  const [semRegistro, setSemRegistro] = useState(0);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!aberto || !de || !ate) return;
    let cancelado = false;
    buscar(de, ate, filtro).then((lista) => {
      if (!cancelado) setSemRegistro(lista.filter((a) => a.presenca === 'NAO_INFORMADO' && a.data <= hoje).length);
    });
    return () => {
      cancelado = true;
    };
  }, [aberto, de, ate, filtro]);

  const gerar = async (modo: 'imprimir' | 'pdf') => {
    if (!de || !ate || ate < de) {
      notificar('Confira as datas do período.', 'error');
      return;
    }
    setGerando(true);
    try {
      const html = await montarHtml(de, ate, filtro);
      if (modo === 'pdf') await salvarPdf(html, 'Relatorio_Atendimentos');
      else imprimir(html, 'Relatório de atendimentos');
      aoFechar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={aberto} onClose={aoFechar} maxWidth="xs" fullWidth>
      <DialogTitle>{filtro ? `Relatório de ${filtro.nome}` : 'Relatório de atendimentos'}</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          <Button size="small" onClick={() => { setDe(segundaAtual); setAte(somarDias(segundaAtual, 6)); }}>
            Semana na tela
          </Button>
          <Button size="small" onClick={() => { setDe(iniMes); setAte(fimMes); }}>
            Este mês
          </Button>
          <Button size="small" onClick={() => { setDe(iniMesAnt); setAte(fimMesAnt); }}>
            Mês passado
          </Button>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <CustomTextField label="De" type="date" fullWidth value={de} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDe(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <CustomTextField label="Até" type="date" fullWidth value={ate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAte(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>
        {semRegistro ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {semRegistro} atendimento(s) do período ainda sem presença — vão aparecer como &quot;sem registro&quot;.
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={aoFechar} color="inherit">
          Cancelar
        </Button>
        <Button startIcon={<IconPrinter size={16} />} disabled={gerando} onClick={() => gerar('imprimir')}>
          Imprimir
        </Button>
        <Button variant="contained" disabled={gerando} onClick={() => gerar('pdf')}>
          Gerar PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogoRelatorio;

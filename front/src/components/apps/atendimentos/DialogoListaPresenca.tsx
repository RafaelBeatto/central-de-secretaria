import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Typography } from '@mui/material';
import { IconPrinter } from '@tabler/icons-react';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoAtendimentos } from 'src/servicos/atendimentos';
import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoUnidades } from 'src/servicos/unidades';
import type { ProfissionalAtendimento } from 'src/types/atendimentos';
import { efetivo } from 'src/utils/atendimentos';
import { diaSemanaLongo, somarDias } from 'src/utils/datas';
import { formatarData } from 'src/utils/formatacao';
import { cabecalhoInstitucionalHtml, paginaA4 } from 'src/utils/documentoA4';
import { imprimir, salvarPdf } from 'src/utils/impressaoPdf';
import { mensagemDeErro } from 'src/utils/erroApi';

interface Props {
  aberto: boolean;
  dia: string | null;
  segundaAtual: string;
  tituloSemana: string;
  profissionais: ProfissionalAtendimento[];
  aoFechar: () => void;
}

async function montarHtml(datas: string[], profissional: ProfissionalAtendimento | null) {
  const todos = await servicoAtendimentos.itens(datas[0], datas[datas.length - 1]);
  const lista = todos
    .filter((a) => efetivo(a) && datas.includes(a.data) && (!profissional || a.profissionalId === profissional.id))
    .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`) || a.alunoNome.localeCompare(b.alunoNome, 'pt-BR'));
  if (!lista.length) return null;

  const unidade = await servicoUnidades.atual();
  const logoUrl = unidade.logoArquivoId ? await servicoArquivos.url(unidade.logoArquivoId).catch(() => null) : null;
  const cabecalho = cabecalhoInstitucionalHtml(unidade, logoUrl);

  const porDia = (d: string) => lista.filter((a) => a.data === d);
  const diasComDados = datas.filter((d) => porDia(d).length);
  const th = (t: string, w?: string) => `<th style="text-align:left;padding:5px 6px;border:1px solid #000;background:#eee;${w ? `width:${w}` : ''}">${t}</th>`;
  const td = (t: string) => `<td style="padding:7px 6px;border:1px solid #000;vertical-align:middle">${t}</td>`;

  const paginas = diasComDados.map((d, i) => {
    const doDia = porDia(d);
    return `${paginaA4(`${cabecalho}
      <div class="doc-a4-titulo">LISTA DE PRESENÇA</div>
      <p style="text-align:center;margin:-10px 0 16px;font-size:11pt">${diaSemanaLongo(d)}, ${formatarData(d)}${profissional ? ` · ${profissional.nome}` : ''}</p>
      <table style="width:100%;border-collapse:collapse;font-size:10.5pt">
        <thead><tr>${th('Horário', '60px')}${th('Aluno')}${profissional ? '' : th('Profissional')}${th('Veio', '40px')}${th('Faltou', '44px')}${th('Assinatura do responsável', '34%')}</tr></thead>
        <tbody>${doDia
          .map((a) => `<tr>${td(a.horario)}${td(a.alunoNome)}${profissional ? '' : td(a.profissionalNome)}${td('☐')}${td('☐')}${td('&nbsp;')}</tr>`)
          .join('')}</tbody>
      </table>
      <div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_______________________________</div><div>${profissional ? profissional.nome : 'Responsável pelo registro'}</div></div>`)}${i < diasComDados.length - 1 ? '<div class="doc-quebra-pagina"></div>' : ''}`;
  });
  return paginas.join('');
}

/** Folha para assinar a presença do dia ou da semana (old: abrirListaPresenca). */
const DialogoListaPresenca = ({ aberto, dia, segundaAtual, tituloSemana, profissionais, aoFechar }: Props) => {
  const { notificar } = useInteracao();
  const [periodo, setPeriodo] = useState<'dia' | 'semana'>(dia ? 'dia' : 'semana');
  const [profissionalId, setProfissionalId] = useState<number | ''>('');
  const [gerando, setGerando] = useState(false);

  const datas = () => (periodo === 'dia' && dia ? [dia] : Array.from({ length: 7 }, (_, i) => somarDias(segundaAtual, i)));

  const gerar = async (modo: 'imprimir' | 'pdf') => {
    setGerando(true);
    try {
      const profissional = profissionalId ? profissionais.find((p) => p.id === profissionalId) ?? null : null;
      const html = await montarHtml(datas(), profissional);
      if (!html) {
        notificar('Não há atendimentos nesses dias.', 'warning');
        return;
      }
      if (modo === 'pdf') await salvarPdf(html, 'Lista_de_presenca');
      else imprimir(html, 'Lista de presença');
      aoFechar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={aberto} onClose={aoFechar} maxWidth="xs" fullWidth>
      <DialogTitle>Lista de presença</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={0.5}>
          <CustomTextField select fullWidth label="Dias" value={periodo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodo(e.target.value as 'dia' | 'semana')}>
            {dia ? <MenuItem value="dia">{diaSemanaLongo(dia)}, {formatarData(dia)}</MenuItem> : null}
            <MenuItem value="semana">Semana toda ({tituloSemana})</MenuItem>
          </CustomTextField>
          <CustomTextField select fullWidth label="Profissional" value={profissionalId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfissionalId(e.target.value ? Number(e.target.value) : '')}>
            <MenuItem value="">Todos (uma folha por dia)</MenuItem>
            {profissionais.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </CustomTextField>
          <Typography variant="caption" color="textSecondary">
            Sai com o cabeçalho da instituição, uma linha por atendimento e espaço para a assinatura do responsável. Remarcados saem na data nova.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={aoFechar} color="inherit">
          Cancelar
        </Button>
        <Button startIcon={<IconPrinter size={16} />} disabled={gerando} onClick={() => gerar('imprimir')}>
          Imprimir
        </Button>
        <Button variant="contained" disabled={gerando} onClick={() => gerar('pdf')}>
          Salvar PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogoListaPresenca;

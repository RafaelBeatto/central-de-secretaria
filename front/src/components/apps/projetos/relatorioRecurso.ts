import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoUnidades } from 'src/servicos/unidades';
import { RecursoDetalhe, ROTULO_STATUS_EXECUCAO } from 'src/types/projetos';
import { cabecalhoInstitucionalHtml, escapeHtml, paginaA4 } from 'src/utils/documentoA4';
import { salvarPdf } from 'src/utils/impressaoPdf';
import { formatarMoeda } from 'src/utils/projetos';

/** Relatório do recurso em PDF: números do recurso + tabela das execuções (old: montarRelatorioRecursoHTML). */
export async function gerarRelatorioRecurso(r: RecursoDetalhe) {
  const unidade = await servicoUnidades.atual();
  const logoUrl = unidade.logoArquivoId ? await servicoArquivos.url(unidade.logoArquivoId).catch(() => null) : null;
  const f = r.financeiro;
  const celula = 'style="border:1px solid #000;padding:6px"';
  const linhas = r.execucoes
    .map(
      (e, i) =>
        `<tr><td ${celula}>${i + 1}</td><td ${celula}>${escapeHtml(e.nome)}</td><td ${celula}>${ROTULO_STATUS_EXECUCAO[e.status]}</td>` +
        `<td ${celula}>${formatarMoeda(e.situacao.planejado)}</td><td ${celula}>${formatarMoeda(e.situacao.pago)}</td><td ${celula}>${formatarMoeda(e.situacao.saldo)}</td></tr>`,
    )
    .join('');
  const html = paginaA4(`
    ${cabecalhoInstitucionalHtml(unidade, logoUrl)}
    <h2 class="doc-a4-titulo">Relatório do Recurso</h2>
    <h3 style="text-align:center;margin:0 0 20px">${escapeHtml(r.nome)}</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
      <tr><td ${celula}><b>Valor recebido</b></td><td ${celula}>${formatarMoeda(f.recebido)}</td><td ${celula}><b>Valor distribuído</b></td><td ${celula}>${formatarMoeda(f.distribuido)}</td></tr>
      <tr><td ${celula}><b>Valor executado</b></td><td ${celula}>${formatarMoeda(f.pago)}</td><td ${celula}><b>Saldo não distribuído</b></td><td ${celula}>${formatarMoeda(f.naoDistribuido)}</td></tr>
      <tr><td ${celula}><b>Saldo das execuções</b></td><td ${celula}>${formatarMoeda(f.saldoExecucoes)}</td><td ${celula}><b>Origem/tipo</b></td><td ${celula}>${escapeHtml(r.fonteRecurso)}</td></tr>
    </table>
    <h4>Execuções</h4>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th ${celula}>#</th><th ${celula}>Nome</th><th ${celula}>Status</th><th ${celula}>Planejado</th><th ${celula}>Executado</th><th ${celula}>Saldo</th></tr></thead>
      <tbody>${linhas || `<tr><td ${celula} colspan="6">Nenhuma execução cadastrada.</td></tr>`}</tbody>
    </table>`);
  await salvarPdf(html, `Relatorio_${r.nome}`);
}

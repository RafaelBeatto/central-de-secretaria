import type { UnidadeDetalhe } from 'src/types/acesso';

/**
 * Folha A4 para imprimir/gerar PDF (lista de presença, relatórios…), com o
 * cabeçalho institucional. Reaproveitável pelos módulos seguintes que também
 * geram documentos (old/js/17-gerador-documentos.js: DOC_A4_PRINT_CSS).
 */
export const ESTILO_A4 = `
  body{margin:0;background:#fff;color:#000;font-family:'Times New Roman',Georgia,serif;}
  .doc-a4-page{width:210mm;min-height:297mm;padding:20mm 18mm;margin:0 auto;box-sizing:border-box;}
  .doc-a4-cabecalho{display:flex;align-items:center;gap:16px;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:24px;}
  .doc-a4-inst-info{display:flex;flex-direction:column;flex:1;text-align:center;font-size:11pt;line-height:1.5;}
  .doc-a4-inst-info strong{font-size:13pt;}
  .doc-a4-titulo{text-align:center;font-weight:bold;font-size:14pt;margin:0 0 20px;text-transform:uppercase;letter-spacing:.5px;}
  .doc-a4-assinatura{margin-top:40px;text-align:center;font-size:12pt;}
  .doc-a4-linha-assinatura{margin-bottom:6px;}
  .doc-quebra-pagina{page-break-after:always;break-after:page;height:0;}
  @media print{ @page{ size:A4; margin:0; } .doc-a4-page{ margin:0; } }
`;

function escapeHtml(texto: string) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

export function cabecalhoInstitucionalHtml(unidade: UnidadeDetalhe | undefined, logoUrl: string | null) {
  const contato = [unidade?.telefone, unidade?.email].filter(Boolean).map((t) => escapeHtml(t as string)).join(' · ');
  return `<div class="doc-a4-cabecalho">
    ${logoUrl ? `<div><img src="${logoUrl}" alt="Logo" style="max-height:70px;max-width:140px;object-fit:contain"></div>` : ''}
    <div class="doc-a4-inst-info">
      <strong>${escapeHtml(unidade?.nome ?? 'Instituição não configurada')}</strong>
      ${unidade?.endereco ? `<span>${escapeHtml(unidade.endereco)}</span>` : ''}
      ${contato ? `<span>${contato}</span>` : ''}
    </div>
  </div>`;
}

export const paginaA4 = (conteudo: string) => `<div class="doc-a4-page">${conteudo}</div>`;

import { ESTILO_A4 } from './documentoA4';

/** Abre uma janela só com o documento e chama a impressão do navegador. */
export function imprimir(html: string, titulo: string) {
  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) {
    throw new Error('Permita pop-ups neste site para imprimir o documento.');
  }
  janela.document.write(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${titulo}</title><style>${ESTILO_A4}</style></head><body>${html}</body></html>`,
  );
  janela.document.close();
  let impresso = false;
  const disparar = () => {
    if (impresso) return;
    impresso = true;
    janela.focus();
    janela.print();
  };
  janela.onload = disparar;
  setTimeout(disparar, 500);
}

/** Gera e baixa o PDF (html2pdf.js) a partir do mesmo HTML usado na impressão. */
export async function salvarPdf(html: string, nomeArquivo: string, opcoes: { paginaXdeY?: boolean } = {}) {
  const { default: html2pdf } = await import('html2pdf.js');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<style>${ESTILO_A4}</style>${html}`;
  const trabalho = html2pdf()
    .set({
      margin: 0,
      filename: `${nomeArquivo.replace(/[^\w-]+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      pagebreak: { mode: ['css'], before: '.doc-quebra-pagina' },
    } as never)
    .from(wrapper);
  if (!opcoes.paginaXdeY) {
    await trabalho.save();
    return;
  }
  // "Página X de Y" só é possível depois que o PDF existe e o total de páginas é conhecido.
  const comNumeracao = trabalho
    .toPdf()
    .get('pdf')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((pdf: any) => {
      const total = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(90);
        pdf.text(`Página ${i} de ${total}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 8, { align: 'center' });
      }
    });
  // O worker do html2pdf continua encadeável depois do `then`, mas a tipagem não diz isso.
  await (comNumeracao as unknown as { save: () => Promise<void> }).save();
}

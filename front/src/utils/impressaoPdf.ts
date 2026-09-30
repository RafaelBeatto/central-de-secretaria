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
export async function salvarPdf(html: string, nomeArquivo: string) {
  const { default: html2pdf } = await import('html2pdf.js');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<style>${ESTILO_A4}</style>${html}`;
  await html2pdf()
    .set({
      margin: 0,
      filename: `${nomeArquivo.replace(/[^\w-]+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      pagebreak: { mode: ['css'], before: '.doc-quebra-pagina' },
    } as never)
    .from(wrapper)
    .save();
}

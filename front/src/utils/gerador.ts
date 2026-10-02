import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoUnidades } from 'src/servicos/unidades';
import type { UnidadeDetalhe } from 'src/types/acesso';
import type { Assinaturas, Campos, DocumentoGerado, DocumentoGeradoItem, FormatoModelo, VersaoDocumentoGerado } from 'src/types/gerador';
import { doIso, MESES } from './datas';
import { cabecalhoInstitucionalHtml, escapeHtml, paginaA4, rodapeInstitucionalHtml } from './documentoA4';
import { formatarData } from './formatacao';

/** Campos longos ganham área de texto em vez de uma linha (old: GERADOR_CAMPOS_LONGOS). */
export const CAMPOS_LONGOS = ['TEXTO', 'PAUTA', 'DELIBERACOES', 'CLAUSULAS', 'JUSTIFICATIVA', 'OBJETIVO', 'ATIVIDADES', 'RESULTADOS', 'CONSIDERACOES', 'PRESENTES', 'OBJETO'];

const ROTULOS_CONTEXTO: Record<string, string> = {
  NOME_ALUNO: 'Nome do aluno',
  NOME_EMPRESA: 'Razão social da empresa',
  CNPJ_EMPRESA: 'CNPJ da empresa',
  ENDERECO_EMPRESA: 'Endereço da empresa',
  TELEFONE_EMPRESA: 'Telefone da empresa',
  EMAIL_EMPRESA: 'E-mail da empresa',
  REPRESENTANTE: 'Representante',
  CPF_REPRESENTANTE: 'CPF do representante',
  NOME_PROJETO: 'Nome do projeto',
  PROFISSIONAL: 'Profissional',
  DATA_ATENDIMENTO: 'Data do atendimento',
  VALOR: 'Valor',
};

const ACENTOS: Record<string, string> = {
  destinatario: 'destinatário', destinatarios: 'destinatários', orgao: 'órgão', horario: 'horário', periodo: 'período', responsavel: 'responsável',
  deliberacoes: 'deliberações', consideracoes: 'considerações', observacao: 'observação', endereco: 'endereço', mes: 'mês', numero: 'número',
  convocacao: 'convocação', referencia: 'referência', informacoes: 'informações', cnpj: 'CNPJ', cpf: 'CPF',
};

/** "DESTINATARIO" → "Destinatário" (old: geRotuloCampo). */
export function rotuloCampo(nome: string) {
  if (ROTULOS_CONTEXTO[nome]) return ROTULOS_CONTEXTO[nome];
  const texto = nome
    .toLowerCase()
    .split('_')
    .map((p) => ACENTOS[p] ?? p)
    .join(' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** [CAMPO] — o usuário preenche na hora de gerar. */
export function extrairManuais(texto: string) {
  const achados = new Set<string>();
  for (const m of texto.matchAll(/\[([A-ZÀ-Ú0-9_ ]+)\]/g)) {
    const nome = m[1].trim();
    if (nome) achados.add(nome);
  }
  return [...achados];
}

/** {CAMPO} — o sistema preenche (automáticos) ou o usuário informa (contexto). */
export function extrairChaves(texto: string) {
  return [...new Set([...texto.matchAll(/\{([A-ZÀ-Ú0-9_]+)\}/g)].map((m) => m[1]))];
}

export const usaNumeracao = (texto: string) => texto.includes('{NUMERO}');

export const dataExtenso = (iso: string) => {
  const d = doIso(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

/** Campos {AUTOMÁTICOS}: dados da instituição, data do documento e número (old: camposAutomaticosGerador). */
export function camposAutomaticos(unidade: UnidadeDetalhe | undefined, dataIso: string, numero: string | null): Campos {
  const u = unidade;
  return {
    NOME_APAE: u?.nome ?? '',
    CNPJ_APAE: u?.cnpj ?? '',
    ENDERECO_APAE: u?.endereco ?? '',
    TELEFONE_APAE: u?.telefone ?? '',
    EMAIL_APAE: u?.email ?? '',
    CIDADE_UF: u?.cidadeUf ?? '',
    PRESIDENTE: u?.presidente ?? '',
    CPF_PRESIDENTE: u?.cpfPresidente ?? '',
    DATA: `${u?.cidadeUf ? `${u.cidadeUf}, ` : ''}${dataExtenso(dataIso)}.`,
    DATA_CURTA: formatarData(dataIso),
    ANO: String(doIso(dataIso).getFullYear()),
    NUMERO: numero ?? '',
  };
}

/** Nomes dos {CAMPOS} que o sistema preenche sozinho. */
export const NOMES_AUTOMATICOS = ['NOME_APAE', 'CNPJ_APAE', 'ENDERECO_APAE', 'TELEFONE_APAE', 'EMAIL_APAE', 'CIDADE_UF', 'PRESIDENTE', 'CPF_PRESIDENTE', 'DATA', 'DATA_CURTA', 'ANO', 'NUMERO'];

/** Separa os {CAMPOS} do texto em automáticos e de contexto (que o usuário informa). */
export function classificarChaves(texto: string) {
  const todos = extrairChaves(texto);
  return {
    automaticos: todos.filter((c) => NOMES_AUTOMATICOS.includes(c)),
    contexto: todos.filter((c) => !NOMES_AUTOMATICOS.includes(c)),
  };
}

export interface InstituicaoCarregada {
  unidade: UnidadeDetalhe;
  logoUrl: string | null;
}

export async function carregarInstituicao(): Promise<InstituicaoCarregada> {
  const unidade = await servicoUnidades.atual();
  const logoUrl = unidade.logoArquivoId ? await servicoArquivos.url(unidade.logoArquivoId).catch(() => null) : null;
  return { unidade, logoUrl };
}

/** O que basta para montar o documento: o próprio documento, uma versão antiga ou o rascunho do formulário. */
export interface FonteDocumento {
  titulo: string;
  texto: string;
  formato: FormatoModelo;
  espacamento: string | null;
  dataGeracao: string;
  numero: string | null;
  valores: Campos;
  contexto: Campos;
  assinaturas: Assinaturas;
}

/** Fonte para montar o documento atual ou uma versão anterior dele. */
export const fonteDoDocumento = (d: DocumentoGerado, v?: VersaoDocumentoGerado): FonteDocumento => ({
  titulo: d.titulo || d.modeloNome,
  texto: v?.texto ?? d.texto,
  formato: d.formato,
  espacamento: d.espacamento,
  dataGeracao: d.dataGeracao,
  numero: d.numero,
  valores: v?.valores ?? d.valores,
  contexto: v?.contexto ?? d.contexto,
  assinaturas: v?.assinaturas ?? d.assinaturas,
});

const substituir = (texto: string, padrao: RegExp, valores: Campos, formato: (nome: string) => string) =>
  texto.replace(padrao, (marcador, nome: string) => {
    const v = valores[formato(nome)];
    return v ? escapeHtml(v) : marcador;
  });

/** Corpo: {CAMPO} primeiro (só existe no modelo), depois [CAMPO] com o que foi digitado. Faltantes ficam visíveis. */
export function montarCorpo(f: FonteDocumento, unidade: UnidadeDetalhe | undefined) {
  const chaves = { ...camposAutomaticos(unidade, f.dataGeracao, f.numero), ...f.contexto };
  // Modelo do editor já é HTML (sanitizado no back); o de texto puro é escapado e ganha <br>.
  let corpo = f.formato === 'HTML' ? f.texto : escapeHtml(f.texto);
  corpo = substituir(corpo, /\{([A-ZÀ-Ú0-9_]+)\}/g, chaves, (n) => n);
  corpo = substituir(corpo, /\[([A-ZÀ-Ú0-9_ ]+)\]/g, f.valores, (n) => n.trim());
  return f.formato === 'HTML' ? corpo : corpo.replace(/\n/g, '<br>');
}

/** Folha A4 completa (cabeçalho, título, corpo, assinaturas e rodapé). `destacarFaltas` é só para a prévia. */
export function montarHtmlDocumento(f: FonteDocumento, inst: InstituicaoCarregada | undefined, destacarFaltas = false) {
  let corpo = montarCorpo(f, inst?.unidade);
  if (destacarFaltas) {
    corpo = corpo.replace(/(\[[A-ZÀ-Ú0-9_ ]+\]|\{[A-ZÀ-Ú0-9_]+\})/g, '<mark style="background:#fff3a3">$1</mark>');
  }
  const estilo = [f.espacamento ? `line-height:${escapeHtml(f.espacamento)}` : '', f.formato === 'HTML' ? 'white-space:normal' : '']
    .filter(Boolean)
    .join(';');
  const assinaturas = f.assinaturas
    .map(
      (linhas) =>
        `<div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_________________________</div>${linhas
          .map((t) => `<div>${escapeHtml(t)}</div>`)
          .join('')}</div>`,
    )
    .join('');
  return paginaA4(`${cabecalhoInstitucionalHtml(inst?.unidade, inst?.logoUrl ?? null)}
    <div class="doc-a4-titulo">${escapeHtml(f.titulo)}</div>
    <div class="doc-a4-corpo"${estilo ? ` style="${estilo}"` : ''}>${corpo}</div>${assinaturas}${rodapeInstitucionalHtml(inst?.unidade)}`);
}

export const nomeDocumento = (d: { modeloNome: string; numero: string | null }) => (d.numero ? `${d.modeloNome} nº ${d.numero}` : d.modeloNome);

/** Texto de busca: nome, número, data e tudo o que foi preenchido (old: textoPesquisaDocumento). */
export const textoBusca = (d: DocumentoGeradoItem) =>
  [d.modeloNome, d.titulo, d.numero, formatarData(d.dataGeracao), ...Object.values(d.valores), ...Object.values(d.contexto), ...d.assinaturas.flat(), d.vinculoRotulo]
    .filter(Boolean)
    .join(' ');

const PREFERIDOS = ['DESTINATARIO', 'NOME', 'NOME_ALUNO', 'NOME_EMPRESA', 'CONVOCADOS', 'DESTINATARIOS', 'ASSUNTO', 'FINALIDADE', 'REFERENTE', 'OBJETO'];

/** Resumo curto para a lista: a quem se destina ou do que trata. */
export function resumoDocumento(d: DocumentoGeradoItem) {
  const achados = PREFERIDOS.map((k) => d.valores[k] || d.contexto[k]).filter(Boolean);
  const texto = [...new Set(achados)].slice(0, 2).join(' · ');
  return texto.length > 90 ? `${texto.slice(0, 88)}…` : texto;
}

export const nomeArquivoPdf = (d: { modeloNome: string; numero: string | null }) => nomeDocumento(d).replace(/\//g, '-');

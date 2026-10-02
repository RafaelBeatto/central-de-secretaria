import { servicoAtendimentos } from 'src/servicos/atendimentos';
import { servicoDocumentos } from 'src/servicos/documentos';
import { servicoEmpresas } from 'src/servicos/empresas';
import { servicoProjetos } from 'src/servicos/projetos';
import { servicoTarefas } from 'src/servicos/tarefas';
import type { Campos, RegistroVinculo, TipoVinculo } from 'src/types/gerador';
import { hojeIso, somarDias } from './datas';
import { formatarData } from './formatacao';
import { formatarMoeda } from './projetos';

/** Só o que tem valor entra: campo vazio não apaga o que o usuário já digitou. */
const limpar = (campos: Record<string, string | null | undefined>): Campos =>
  Object.fromEntries(Object.entries(campos).filter(([, v]) => v)) as Campos;

const pronto = (campos: Campos) => () => Promise.resolve(campos);

/** Rotas para abrir o registro ligado (os módulos aceitam o id na URL). */
export const ROTA_VINCULO: Record<TipoVinculo, (id: number) => string> = {
  EMPRESA: (id) => `/empresas?empresa=${id}`,
  EXECUCAO: (id) => `/projetos?execucao=${id}`,
  ALUNO: () => '/atendimentos',
  ATENDIMENTO: () => '/atendimentos',
  DOCUMENTO: (id) => `/documentos?documento=${id}`,
  TAREFA: (id) => `/secretaria?tarefa=${id}`,
};

/**
 * Registros de cada tipo para o seletor "Ligar a um registro", com os campos que cada um preenche
 * (old: listarRegistrosVinculo + dadosDoVinculo). Atendimentos: de 90 dias atrás a 30 dias à frente.
 */
export async function listarRegistros(tipo: TipoVinculo): Promise<RegistroVinculo[]> {
  switch (tipo) {
    case 'EMPRESA':
      return (await servicoEmpresas.listar()).map((e) => ({
        id: e.id,
        rotulo: e.razaoSocial,
        dados: pronto(
          limpar({
            NOME_EMPRESA: e.razaoSocial, CNPJ_EMPRESA: e.cnpj, ENDERECO_EMPRESA: e.endereco, TELEFONE_EMPRESA: e.telefone, EMAIL_EMPRESA: e.email,
            REPRESENTANTE: e.representante, CPF_REPRESENTANTE: e.cpfRepresentante,
            NOME: e.razaoSocial, CNPJ: e.cnpj, ENDERECO: e.endereco, TELEFONE: e.telefone,
            DESTINATARIO: e.representante || e.razaoSocial, FORNECEDOR: e.razaoSocial,
          }),
        ),
      }));
    case 'EXECUCAO':
      return (await servicoProjetos.execucoesDoKanban()).map((x) => ({
        id: x.id,
        rotulo: `${x.nome} (${x.recursoNome})`,
        // O resumo não traz objetivo nem valor: busca o detalhe só se a pessoa escolher este.
        dados: async () => {
          const e = await servicoProjetos.execucao(x.id);
          return limpar({
            NOME_PROJETO: e.nome, PROJETO: e.nome, RESPONSAVEL: e.responsavel, OBJETIVO: e.objetivo,
            PERIODO: `${formatarData(e.dataInicio)} a ${formatarData(e.dataFim)}`,
            VALOR: e.valorPlanejado ? formatarMoeda(e.valorPlanejado) : '', FONTE_RECURSO: e.fonteRecurso,
          });
        },
      }));
    case 'ALUNO':
      return (await servicoAtendimentos.listarAlunos()).map((a) => ({ id: a.id, rotulo: a.nome, dados: pronto(limpar({ NOME_ALUNO: a.nome, NOME: a.nome })) }));
    case 'ATENDIMENTO': {
      const hoje = hojeIso();
      const lista = await servicoAtendimentos.itens(somarDias(hoje, -90), somarDias(hoje, 30));
      return lista
        .slice()
        .sort((a, b) => `${b.data}${b.horario}`.localeCompare(`${a.data}${a.horario}`))
        .map((a) => ({
          id: a.id,
          rotulo: `${a.alunoNome} — ${formatarData(a.data)}${a.horario ? ` ${a.horario}` : ''}`,
          dados: pronto(
            limpar({
              NOME_ALUNO: a.alunoNome, NOME: a.alunoNome, PROFISSIONAL: a.profissionalNome, RESPONSAVEL: a.profissionalNome,
              DATA_ATENDIMENTO: formatarData(a.data), HORARIO: a.horario,
            }),
          ),
        }));
    }
    case 'DOCUMENTO':
      return (await servicoDocumentos.listar()).map((x) => ({
        id: x.id,
        rotulo: x.nome,
        dados: pronto(limpar({ NOME_DOCUMENTO: x.nome, ASSUNTO: x.nome, RESPONSAVEL: x.responsavel })),
      }));
    case 'TAREFA':
      return (await servicoTarefas.ativas()).map((t) => ({
        id: t.id,
        rotulo: t.titulo,
        dados: pronto(limpar({ ASSUNTO: t.titulo, TITULO: t.titulo, RESPONSAVEL: t.responsavel, TEXTO: t.descricao })),
      }));
  }
}

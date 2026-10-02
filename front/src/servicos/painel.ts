import api from 'src/utils/axios';
import { PERMISSOES, CodigoPermissao } from 'src/constantes/permissoes';
import type { DadosPainel, ExtrasPainel } from 'src/types/painel';
import { hojeIso, inicioDaSemana, somarDias } from 'src/utils/datas';
import { servicoAgenda } from './agenda';
import { servicoAtendimentos } from './atendimentos';
import { servicoDocumentos } from './documentos';
import { servicoProjetos } from './projetos';
import { servicoTarefas } from './tarefas';

const vazio = () => Promise.resolve([] as never[]);

/**
 * Carrega as fontes do Painel/Pendências em paralelo, só as que o usuário pode ler.
 * Os módulos já devolvem tudo pronto; "extras" é a única chamada própria (agregada no back).
 */
export async function carregarDadosPainel(tem: (p: CodigoPermissao) => boolean): Promise<DadosPainel> {
  const hoje = hojeIso();
  const segunda = inicioDaSemana(hoje);
  const [tarefas, documentos, agenda, recursos, atendimentosSemana, extras] = await Promise.all([
    tem(PERMISSOES.TAREFA_LER) ? servicoTarefas.ativas(somarDias(hoje, -7)) : vazio(),
    tem(PERMISSOES.DOCUMENTO_LER) ? servicoDocumentos.listar() : vazio(),
    tem(PERMISSOES.AGENDA_LER) ? servicoAgenda.itens(hoje, somarDias(hoje, 7)) : vazio(),
    tem(PERMISSOES.PROJETO_LER) ? servicoProjetos.recursos() : vazio(),
    tem(PERMISSOES.ATENDIMENTO_LER) ? servicoAtendimentos.itens(segunda, somarDias(segunda, 6)) : vazio(),
    api.get<ExtrasPainel>('/painel/extras').then((r) => r.data),
  ]);
  return { tarefas, documentos, agenda, recursos, atendimentosSemana, extras };
}

import { lazy } from 'react';
import {
  IconAlertTriangle,
  IconBuildingCommunity,
  IconBuildingStore,
  IconCalendar,
  IconChartBar,
  IconFiles,
  IconFileUpload,
  IconClipboardList,
  IconFilePencil,
  IconFileText,
  IconFolder,
  IconHeartHandshake,
  IconHistory,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconSearch,
  IconShieldLock,
  IconSitemap,
  IconUsers,
} from '@tabler/icons-react';
import { PERMISSOES, CodigoPermissao } from 'src/constantes/permissoes';

/**
 * Fonte única dos módulos: o menu lateral e as rotas são gerados daqui.
 * Títulos e subtítulos são os mesmos do sistema antigo.
 * Módulo sem "tela" ainda é das próximas fases (abre a página "Em construção").
 */
export interface Modulo {
  caminho: string;
  titulo: string;
  subtitulo: string;
  icone: typeof IconLayoutDashboard;
  grupo: 'Início' | 'Dia a dia' | 'Controle' | 'Consultar' | 'Administração';
  permissao?: CodigoPermissao;
  tela?: ReturnType<typeof lazy>;
  /** Tem rota, mas não aparece no menu (ex.: Pesquisa, aberta pela busca do cabeçalho). */
  oculto?: boolean;
}

export const MODULOS: Modulo[] = [
  {
    caminho: '/painel',
    titulo: 'Painel',
    subtitulo: 'O que resolver, o que tem hoje e conversas com a equipe',
    icone: IconLayoutDashboard,
    grupo: 'Início',
    tela: lazy(() => import('src/views/painel/Painel')),
  },
  {
    caminho: '/pendencias',
    titulo: 'Pendências',
    subtitulo: 'Tudo o que espera por você, com a ação ali mesmo',
    icone: IconAlertTriangle,
    grupo: 'Início',

    tela: lazy(() => import('src/views/pendencias/Pendencias')),
  },
  {
    caminho: '/secretaria',
    titulo: 'Secretaria',
    subtitulo: 'Tarefas e rotinas do dia a dia',
    icone: IconClipboardList,
    grupo: 'Dia a dia',
    permissao: PERMISSOES.TAREFA_LER,
    tela: lazy(() => import('src/views/secretaria/Secretaria')),
  },
  {
    caminho: '/agenda',
    titulo: 'Agenda',
    subtitulo: 'Eventos, tarefas e prazos num só calendário',
    icone: IconCalendar,
    grupo: 'Dia a dia',
    permissao: PERMISSOES.AGENDA_LER,
    tela: lazy(() => import('src/views/agenda/Agenda')),
  },
  {
    caminho: '/atendimentos',
    titulo: 'Atendimentos',
    subtitulo: 'Controle semanal de atendimentos dos alunos',
    icone: IconHeartHandshake,
    grupo: 'Dia a dia',
    permissao: PERMISSOES.ATENDIMENTO_LER,
    tela: lazy(() => import('src/views/atendimentos/Atendimentos')),
  },
  {
    caminho: '/meus-relatorios',
    titulo: 'Meus Relatórios',
    subtitulo: 'Envie seus relatórios em PDF e consulte o que já entregou',
    icone: IconFileUpload,
    grupo: 'Dia a dia',
    permissao: PERMISSOES.RELATORIO_PROF_ENVIAR,
    tela: lazy(() => import('src/views/relatoriosProfissionais/MeusRelatorios')),
  },
  {
    caminho: '/kanban',
    titulo: 'Kanban',
    subtitulo: 'Tarefas e execuções de projeto em colunas por situação',
    icone: IconLayoutKanban,
    grupo: 'Dia a dia',
    permissao: PERMISSOES.TAREFA_LER,
    tela: lazy(() => import('src/views/kanban/Kanban')),
  },
  {
    caminho: '/projetos',
    titulo: 'Projetos',
    subtitulo: 'Recursos recebidos e onde cada real foi aplicado',
    icone: IconFolder,
    grupo: 'Controle',
    permissao: PERMISSOES.PROJETO_LER,
    tela: lazy(() => import('src/views/projetos/Projetos')),
  },
  {
    caminho: '/documentos',
    titulo: 'Documentos',
    subtitulo: 'Documentos da instituição e quando renovar',
    icone: IconFileText,
    grupo: 'Controle',
    permissao: PERMISSOES.DOCUMENTO_LER,
    tela: lazy(() => import('src/views/documentos/Documentos')),
  },
  {
    caminho: '/gerador',
    titulo: 'Gerador de Documentos',
    subtitulo: 'Ofícios, declarações, recibos e outros documentos com o cabeçalho da instituição',
    icone: IconFilePencil,
    grupo: 'Controle',
    permissao: PERMISSOES.GERADOR_LER,
    tela: lazy(() => import('src/views/gerador/Gerador')),
  },
  {
    caminho: '/empresas',
    titulo: 'Empresas',
    subtitulo: 'Fornecedores, documentos e cotações em um só cadastro',
    icone: IconBuildingStore,
    grupo: 'Controle',
    permissao: PERMISSOES.EMPRESA_LER,
    tela: lazy(() => import('src/views/empresas/Empresas')),
  },
  {
    caminho: '/historico',
    titulo: 'Histórico',
    subtitulo: 'Tudo o que foi feito no sistema, dia a dia',
    icone: IconHistory,
    grupo: 'Consultar',
    permissao: PERMISSOES.HISTORICO_LER,
    tela: lazy(() => import('src/views/historico/Historico')),
  },
  {
    caminho: '/pesquisa',
    titulo: 'Pesquisa',
    subtitulo: 'Resultados da busca em todo o sistema',
    icone: IconSearch,
    grupo: 'Consultar',
    oculto: true,
    tela: lazy(() => import('src/views/pesquisa/Pesquisa')),
  },
  {
    caminho: '/relatorios',
    titulo: 'Relatórios',
    subtitulo: 'Relatório de atividades do período',
    icone: IconChartBar,
    grupo: 'Consultar',
    permissao: PERMISSOES.RELATORIO_LER,
    tela: lazy(() => import('src/views/relatorios/Relatorios')),
  },
  {
    caminho: '/central-relatorios',
    titulo: 'Central de Relatórios',
    subtitulo: 'Relatórios em PDF entregues por professores e profissionais',
    icone: IconFiles,
    grupo: 'Consultar',
    permissao: PERMISSOES.RELATORIO_PROF_LER,
    tela: lazy(() => import('src/views/relatoriosProfissionais/CentralRelatorios')),
  },
  {
    caminho: '/administracao/usuarios',
    titulo: 'Usuários',
    subtitulo: 'Quem acessa o sistema, com qual cargo e em qual unidade',
    icone: IconUsers,
    grupo: 'Administração',
    permissao: PERMISSOES.USUARIO_LER,
    tela: lazy(() => import('src/views/administracao/usuarios/Usuarios')),
  },
  {
    caminho: '/administracao/unidades',
    titulo: 'Unidades',
    subtitulo: 'Federações e APAEs subordinadas',
    icone: IconSitemap,
    grupo: 'Administração',
    permissao: PERMISSOES.UNIDADE_LER,
    tela: lazy(() => import('src/views/administracao/unidades/Unidades')),
  },
  {
    caminho: '/administracao/permissoes',
    titulo: 'Permissões',
    subtitulo: 'O que cada cargo pode ver e fazer nesta unidade',
    icone: IconShieldLock,
    grupo: 'Administração',
    permissao: PERMISSOES.PERMISSAO_LER,
    tela: lazy(() => import('src/views/administracao/permissoes/Permissoes')),
  },
  {
    caminho: '/administracao/instituicao',
    titulo: 'Dados da instituição',
    subtitulo: 'Cabeçalho e rodapé de todos os documentos e PDFs',
    icone: IconBuildingCommunity,
    grupo: 'Administração',
    permissao: PERMISSOES.INSTITUICAO_ESCREVER,
    tela: lazy(() => import('src/views/administracao/instituicao/DadosInstituicao')),
  },
];

export const moduloPorCaminho = (caminho: string) => MODULOS.find((m) => caminho.startsWith(m.caminho));

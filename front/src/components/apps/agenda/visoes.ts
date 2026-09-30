import type { ItemAgenda } from 'src/types/agenda';

/** O que as três visões (Semana, Mês e Lista) recebem da tela. */
export interface PropsVisao {
  porDia: Record<string, ItemAgenda[]>;
  inicio: string;
  fim: string;
  /** Data de referência (define o mês na visão Mês). */
  referencia: string;
  diaEscolhido: string;
  chaveSelecionada: string | null;
  podeArrastar: (i: ItemAgenda) => boolean;
  podeMarcar: (i: ItemAgenda) => boolean;
  aoEscolherDia: (iso: string) => void;
  aoAbrir: (i: ItemAgenda) => void;
  aoMarcar: (i: ItemAgenda) => void;
  aoSoltar: (chave: string, iso: string) => void;
}

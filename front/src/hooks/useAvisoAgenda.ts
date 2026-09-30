import { useEffect } from 'react';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoAgenda } from 'src/servicos/agenda';
import type { ItemAgenda } from 'src/types/agenda';
import { hora } from 'src/utils/agenda';
import { hojeIso } from 'src/utils/datas';
import { usePermissao } from './usePermissao';

const MINUTO = 60_000;
/** Os eventos de hoje são buscados de novo a cada 5 minutos (pegam o que foi criado/concluído). */
const RECARREGAR_A_CADA = 5;
const ANTECEDENCIA_MINUTOS = 30;

function jaAvisados(chave: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(chave) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * Aviso "⏰ Título — 14:00" até 30 min antes de um evento de hoje não concluído,
 * uma vez por evento por dia (old/js/05-agenda.js). Montado no FullLayout, vale em qualquer tela.
 */
export function useAvisoAgenda() {
  const { tem } = usePermissao();
  const { notificar } = useInteracao();
  const pode = tem(PERMISSOES.AGENDA_LER);

  useEffect(() => {
    if (!pode) return;
    let eventos: ItemAgenda[] = [];
    let ciclo = 0;

    const verificar = async () => {
      const hoje = hojeIso();
      if (ciclo++ % RECARREGAR_A_CADA === 0) {
        try {
          eventos = (await servicoAgenda.itens(hoje, hoje)).filter((i) => i.origem === 'EVENTO');
        } catch {
          return;
        }
      }
      const chave = `agenda_avisos_${hoje}`;
      const avisados = jaAvisados(chave);
      const agora = Date.now();
      const alvo = eventos.find((e) => {
        if (e.data !== hoje || e.concluido || !e.horarioInicio || avisados.includes(e.chave)) return false;
        const inicio = new Date(`${e.data}T${hora(e.horarioInicio)}`).getTime();
        return (inicio - agora) / MINUTO <= ANTECEDENCIA_MINUTOS;
      });
      if (!alvo) return;
      try {
        localStorage.setItem(chave, JSON.stringify([...avisados, alvo.chave]));
      } catch {
        // Sem armazenamento local: o aviso pode repetir, mas não quebra a tela.
      }
      notificar(`⏰ ${alvo.titulo} — ${hora(alvo.horarioInicio)}`, 'info');
    };

    const primeiro = setTimeout(verificar, 1500);
    const intervalo = setInterval(verificar, MINUTO);
    return () => {
      clearTimeout(primeiro);
      clearInterval(intervalo);
    };
  }, [pode, notificar]);
}

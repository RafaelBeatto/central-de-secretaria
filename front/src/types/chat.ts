/** Tipos do chat (DTOs do pacote chat no back). */

export interface ContatoChat {
  id: number;
  nomeCompleto: string;
  cargoNome: string;
}

export interface MensagemChat {
  id: number;
  conversaId: number;
  remetenteId: number;
  texto: string;
  enviadaEm: string;
  lidaEm: string | null;
}

export interface ConversaResumo {
  id: number;
  outroUsuario: ContatoChat;
  ultimaMensagem: MensagemChat | null;
  naoLidas: number;
}

export interface EventoChat {
  tipo: 'MENSAGEM' | 'LIDAS';
  conversaId: number;
  mensagem: MensagemChat | null;
}

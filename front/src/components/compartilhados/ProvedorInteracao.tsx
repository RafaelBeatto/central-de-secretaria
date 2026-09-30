import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Snackbar,
} from '@mui/material';

/**
 * Avisos rápidos (antigo showToast) e confirmação (antigo confirmAction),
 * disponíveis em qualquer tela via useInteracao().
 */
type Tom = 'success' | 'error' | 'warning' | 'info';

interface Interacao {
  notificar: (mensagem: string, tom?: Tom) => void;
  confirmar: (texto: string, opcoes?: { rotuloConfirmar?: string; perigo?: boolean }) => Promise<boolean>;
}

const ContextoInteracao = createContext<Interacao | null>(null);

export function ProvedorInteracao({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<{ mensagem: string; tom: Tom; chave: number } | null>(null);
  const [pergunta, setPergunta] = useState<{ texto: string; rotulo: string; perigo: boolean } | null>(null);
  const resolver = useRef<(resposta: boolean) => void>();

  const notificar = useCallback((mensagem: string, tom: Tom = 'success') => {
    setAviso({ mensagem, tom, chave: Date.now() });
  }, []);

  const confirmar = useCallback<Interacao['confirmar']>((texto, opcoes = {}) => {
    setPergunta({ texto, rotulo: opcoes.rotuloConfirmar ?? 'Confirmar', perigo: opcoes.perigo ?? true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const responder = (resposta: boolean) => {
    resolver.current?.(resposta);
    setPergunta(null);
  };

  const valor = useMemo(() => ({ notificar, confirmar }), [notificar, confirmar]);

  return (
    <ContextoInteracao.Provider value={valor}>
      {children}
      <Snackbar
        key={aviso?.chave}
        open={!!aviso}
        autoHideDuration={3500}
        onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={aviso?.tom} variant="filled" onClose={() => setAviso(null)} sx={{ width: '100%' }}>
          {aviso?.mensagem}
        </Alert>
      </Snackbar>
      <Dialog open={!!pergunta} onClose={() => responder(false)} maxWidth="xs" fullWidth>
        <DialogContent>
          <DialogContentText color="textPrimary">{pergunta?.texto}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => responder(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={() => responder(true)}
            variant="contained"
            color={pergunta?.perigo ? 'error' : 'primary'}
            autoFocus
          >
            {pergunta?.rotulo}
          </Button>
        </DialogActions>
      </Dialog>
    </ContextoInteracao.Provider>
  );
}

export function useInteracao() {
  const contexto = useContext(ContextoInteracao);
  if (!contexto) throw new Error('useInteracao precisa estar dentro de <ProvedorInteracao>');
  return contexto;
}

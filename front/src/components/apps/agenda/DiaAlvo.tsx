import { useState } from 'react';
import { Box, BoxProps } from '@mui/material';
import { TIPO_ARRASTE } from './cores';

type Props = BoxProps & {
  iso: string;
  aoEscolher: (iso: string) => void;
  /** Soltou um evento/tarefa arrastado neste dia. */
  aoSoltar?: (chave: string, iso: string) => void;
};

/** Dia clicável da Semana e do Mês, que também recebe itens arrastados. */
const DiaAlvo = ({ iso, aoEscolher, aoSoltar, sx, children, ...resto }: Props) => {
  const [alvo, setAlvo] = useState(false);
  const aceita = (e: React.DragEvent) => !!aoSoltar && e.dataTransfer.types.includes(TIPO_ARRASTE);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`Escolher o dia ${iso.split('-').reverse().join('/')}`}
      onClick={() => aoEscolher(iso)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          aoEscolher(iso);
        }
      }}
      onDragOver={(e) => {
        if (!aceita(e)) return;
        e.preventDefault();
        setAlvo(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(false);
      }}
      onDrop={(e) => {
        setAlvo(false);
        const chave = e.dataTransfer.getData(TIPO_ARRASTE);
        if (!chave || !aoSoltar) return;
        e.preventDefault();
        aoSoltar(chave, iso);
      }}
      sx={[{ cursor: 'pointer', outline: alvo ? '2px dashed' : 'none', outlineColor: 'primary.main', outlineOffset: -2 }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...resto}
    >
      {children}
    </Box>
  );
};

export default DiaAlvo;

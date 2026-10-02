import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { ESTILO_DOCUMENTO } from 'src/utils/documentoA4';

/** Largura da folha A4 em pixels (210 mm a 96 dpi). */
const LARGURA_A4 = 794;

interface Props {
  html: string;
  /** Corta a prévia nesta altura (miniatura); sem isso mostra o documento inteiro. */
  alturaMaxima?: number;
}

/** O documento A4 reduzido para caber na largura disponível (miniatura, prévia ao vivo e visualização). */
const PaginaA4Previa = ({ html, alturaMaxima }: Props) => {
  const externo = useRef<HTMLDivElement>(null);
  const interno = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ escala: 1, altura: 1123 });

  useEffect(() => {
    const medir = () => {
      const largura = externo.current?.clientWidth || LARGURA_A4;
      const escala = Math.min(1, largura / LARGURA_A4);
      setMedidas({ escala, altura: interno.current?.offsetHeight || 1123 });
    };
    medir();
    const observador = new ResizeObserver(medir);
    if (externo.current) observador.observe(externo.current);
    if (interno.current) observador.observe(interno.current);
    return () => observador.disconnect();
  }, []);

  const altura = medidas.altura * medidas.escala;
  return (
    <Box
      ref={externo}
      sx={{
        width: '100%',
        height: alturaMaxima ? Math.min(altura, alturaMaxima) : altura,
        overflow: 'hidden',
        bgcolor: '#fff',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <style>{ESTILO_DOCUMENTO}</style>
      <Box
        ref={interno}
        sx={{ width: LARGURA_A4, transformOrigin: 'top left', transform: `scale(${medidas.escala})` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Box>
  );
};

export default PaginaA4Previa;

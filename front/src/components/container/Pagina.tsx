import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import PageContainer from './PageContainer';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AvisoSomenteLeitura from 'src/components/compartilhados/AvisoSomenteLeitura';
import { moduloPorCaminho } from 'src/routes/modulos';

/**
 * Moldura padrão das telas: título da aba, cabeçalho com título/subtítulo do
 * módulo (routes/modulos.ts) e o aviso quando se consulta outra unidade.
 */
const Pagina = ({ children, acoes }: { children: ReactNode; acoes?: JSX.Element }) => {
  const { pathname } = useLocation();
  const modulo = moduloPorCaminho(pathname);
  const titulo = modulo?.titulo ?? 'Central da Secretaria';

  return (
    <PageContainer title={`${titulo} · Central da Secretaria`} description={modulo?.subtitulo}>
      <Breadcrumb title={titulo} subtitle={modulo?.subtitulo}>
        {acoes}
      </Breadcrumb>
      <AvisoSomenteLeitura />
      <>{children}</>
    </PageContainer>
  );
};

export default Pagina;

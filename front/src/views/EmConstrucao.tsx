import { Typography } from '@mui/material';
import Pagina from 'src/components/container/Pagina';
import DashboardCard from 'src/components/shared/DashboardCard';

/** Módulos das próximas fases da migração. */
const EmConstrucao = () => (
  <Pagina>
    <DashboardCard title="Em migração">
      <Typography color="textSecondary">
        Esta tela está sendo trazida do sistema antigo e fica disponível nas próximas fases.
      </Typography>
    </DashboardCard>
  </Pagina>
);

export default EmConstrucao;

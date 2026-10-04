import { useState } from 'react';
import { Alert, Button, LinearProgress, Stack } from '@mui/material';
import { IconUpload } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import ListaRelatorios from 'src/components/apps/relatoriosProfissionais/ListaRelatorios';
import DialogoEnviarRelatorio from 'src/components/apps/relatoriosProfissionais/DialogoEnviarRelatorio';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoRelatoriosProfissionais } from 'src/servicos/relatoriosProfissionais';
import type { RelatorioProfissional } from 'src/types/relatoriosProfissionais';

/** O professor/profissional envia o PDF do relatório (feito fora do sistema) e acompanha o histórico do que entregou. */
const MeusRelatorios = () => {
  const { notificar } = useInteracao();
  const { dados, carregando, erro, recarregar } = useConsulta(servicoRelatoriosProfissionais.meus);
  /** 'novo' = envio avulso; um relatório = atendendo a uma cobrança. */
  const [enviando, setEnviando] = useState<'novo' | RelatorioProfissional | null>(null);

  return (
    <Pagina>
      <Stack direction="row" justifyContent="flex-end" mb={3}>
        <Button variant="contained" startIcon={<IconUpload size={16} />} onClick={() => setEnviando('novo')}>
          Enviar relatório
        </Button>
      </Stack>
      {carregando && !dados ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {dados ? (
        <ListaRelatorios relatorios={dados} aoEntregar={setEnviando} vazio="Você ainda não enviou nenhum relatório. Use “Enviar relatório” para entregar o PDF." />
      ) : null}

      <DialogoEnviarRelatorio
        aberto={!!enviando}
        pendente={enviando && enviando !== 'novo' ? enviando : null}
        aoFechar={() => setEnviando(null)}
        aoEnviar={() => {
          notificar('Relatório enviado.');
          recarregar();
        }}
      />
    </Pagina>
  );
};

export default MeusRelatorios;

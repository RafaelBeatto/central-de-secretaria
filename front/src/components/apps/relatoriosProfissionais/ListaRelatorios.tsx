import { Box, Button, Chip, IconButton, ListItemButton, Stack, Tooltip, Typography } from '@mui/material';
import { IconDownload, IconFileTypePdf } from '@tabler/icons-react';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoRelatoriosProfissionais } from 'src/servicos/relatoriosProfissionais';
import { RelatorioProfissional, ROTULO_STATUS_RELATORIO } from 'src/types/relatoriosProfissionais';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarDataHora } from 'src/utils/formatacao';
import { agruparPorAnoMes, periodoTexto, tamanhoTexto, TOM_STATUS_RELATORIO } from 'src/utils/relatoriosProfissionais';

interface Props {
  relatorios: RelatorioProfissional[];
  /** Só em "Meus Relatórios": mostra "Enviar PDF" nas cobranças pendentes. */
  aoEntregar?: (r: RelatorioProfissional) => void;
  /** Texto quando não há nenhum relatório. */
  vazio: string;
}

/** Cobranças pendentes no topo; entregues por ano e mês (clicar abre o PDF, o botão ao lado baixa). Serve a "Meus Relatórios" e à Central. */
const ListaRelatorios = ({ relatorios, vazio, aoEntregar }: Props) => {
  const { notificar } = useInteracao();

  const executar = async (acao: () => Promise<void>) => {
    try {
      await acao();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  if (!relatorios.length) {
    return (
      <Typography color="textSecondary" py={3} textAlign="center">
        {vazio}
      </Typography>
    );
  }

  const pendentes = relatorios.filter((r) => r.status === 'PENDENTE');
  const entregues = relatorios.filter((r) => r.status !== 'PENDENTE');

  return (
    <Stack spacing={3}>
      {pendentes.length ? (
        <Box component="section" aria-label="Relatórios pendentes">
          <Typography variant="h5" color="warning.main" mb={1}>
            Pendentes
          </Typography>
          {pendentes.map((r) => (
            <Stack key={r.id} direction="row" alignItems="center" spacing={1} sx={{ py: 1, px: 1.5 }}>
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="subtitle1" fontWeight={500} noWrap>
                  {r.nome}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  {[r.nomeAluno && `Aluno: ${r.nomeAluno}`, r.complemento, r.solicitadoEm && `cobrado em ${formatarDataHora(r.solicitadoEm)}`].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
              <Chip size="small" color={TOM_STATUS_RELATORIO[r.status]} label={ROTULO_STATUS_RELATORIO[r.status]} sx={{ flexShrink: 0 }} />
              {aoEntregar ? (
                <Button size="small" variant="contained" onClick={() => aoEntregar(r)} sx={{ flexShrink: 0 }}>
                  Enviar PDF
                </Button>
              ) : null}
            </Stack>
          ))}
        </Box>
      ) : null}
      {agruparPorAnoMes(entregues).map((grupoAno) => (
        <Box key={grupoAno.ano} component="section" aria-label={`Relatórios de ${grupoAno.ano}`}>
          <Typography variant="h5" mb={1}>
            {grupoAno.ano}
          </Typography>
          {grupoAno.meses.map((grupoMes) => (
            <Box key={grupoMes.mes} mb={1.5}>
              <Typography variant="subtitle2" color="textSecondary" mb={0.5}>
                {grupoMes.nome}
              </Typography>
              {grupoMes.relatorios.map((r) => (
                <Stack key={r.id} direction="row" alignItems="center" spacing={0.5}>
                  <ListItemButton
                    onClick={() => executar(() => servicoRelatoriosProfissionais.abrir(r.id))}
                    sx={{ borderRadius: 1, py: 1, px: 1.5, minWidth: 0 }}
                  >
                    <IconFileTypePdf size={22} style={{ flexShrink: 0, marginRight: 10 }} aria-hidden />
                    <Box flexGrow={1} minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={500} noWrap>
                        {r.nome}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" noWrap display="block">
                        {[r.nomeAluno && `Aluno: ${r.nomeAluno}`, periodoTexto(r), r.complemento, tamanhoTexto(r.tamanhoBytes), `enviado em ${formatarDataHora(r.enviadoEm)}`].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    <Chip size="small" color={TOM_STATUS_RELATORIO[r.status]} label={ROTULO_STATUS_RELATORIO[r.status]} sx={{ ml: 1, flexShrink: 0 }} />
                  </ListItemButton>
                  <Tooltip title="Baixar PDF">
                    <IconButton aria-label={`Baixar relatório ${r.nome}`} size="small" onClick={() => executar(() => servicoRelatoriosProfissionais.baixar(r.id, r.nomeArquivo))}>
                      <IconDownload size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Box>
          ))}
        </Box>
      ))}
    </Stack>
  );
};

export default ListaRelatorios;

import { ReactNode } from 'react';
import { Alert, Box, Button, Grid, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { IconArrowLeft, IconEdit, IconPaperclip, IconRefresh, IconTrash, IconX } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import Relacionados from 'src/components/compartilhados/Relacionados';
import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoDocumentos } from 'src/servicos/documentos';
import { Documento, ROTULO_CATEGORIA_DOCUMENTO, ROTULO_EXIGENCIA_APAE } from 'src/types/documentos';
import { precisaRenovar, prazoTexto, situacaoValidade, TOM_SITUACAO } from 'src/utils/documentos';
import { formatarData, formatarDataHora } from 'src/utils/formatacao';

const SEVERIDADE = { error: 'error', warning: 'warning', success: 'success', default: 'info' } as const;

const Fato = ({ rotulo, children }: { rotulo: string; children: ReactNode }) =>
  children ? (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" color="textSecondary" display="block">
        {rotulo}
      </Typography>
      <Box sx={{ overflowWrap: 'anywhere' }}>{children}</Box>
    </Grid>
  ) : null;

interface Props {
  documento: Documento;
  podeAlterar: boolean;
  aoRenovar: () => void;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoFechar: () => void;
}

/** Painel ao lado da lista (no celular ocupa a tela, com "← Documentos"). */
const DetalheDocumento = ({ documento: d, podeAlterar, aoRenovar, aoEditar, aoExcluir, aoFechar }: Props) => {
  const situacao = situacaoValidade(d.dataValidade);
  const tom = TOM_SITUACAO[situacao];

  return (
    <BlankCard>
      <Box p={{ xs: 2, md: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Button color="inherit" size="small" startIcon={<IconArrowLeft size={16} />} onClick={aoFechar} sx={{ display: { md: 'none' } }}>
            Documentos
          </Button>
          <Typography variant="caption" color="textSecondary">
            {d.codigo} · {ROTULO_CATEGORIA_DOCUMENTO[d.categoria]}
          </Typography>
          <IconButton size="small" aria-label="Fechar detalhe" onClick={aoFechar}>
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
          {d.nome}
        </Typography>

        <Alert severity={SEVERIDADE[tom]} icon={false} sx={{ mt: 2 }}>
          <strong>{prazoTexto(d.dataValidade)}</strong>
          {d.dataValidade && situacao !== 'valido' ? ` · Validade: ${formatarData(d.dataValidade)}` : ''}
        </Alert>

        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
          {podeAlterar && d.dataValidade ? (
            <Button size="small" variant={precisaRenovar(d) ? 'contained' : 'outlined'} startIcon={<IconRefresh size={16} />} onClick={aoRenovar}>
              Renovar
            </Button>
          ) : null}
          {d.arquivoId ? (
            <Button size="small" variant="outlined" startIcon={<IconPaperclip size={16} />} onClick={() => servicoArquivos.abrir(d.arquivoId as number)}>
              Abrir arquivo
            </Button>
          ) : null}
          {podeAlterar ? (
            <>
              <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={aoEditar}>
                Editar
              </Button>
              <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={aoExcluir}>
                Excluir
              </Button>
            </>
          ) : null}
        </Stack>

        <Grid container spacing={2} mt={1}>
          <Fato rotulo="Número">{d.numero}</Fato>
          <Fato rotulo="Órgão emissor">{d.orgao}</Fato>
          <Fato rotulo="Emissão">{d.dataEmissao ? formatarData(d.dataEmissao) : null}</Fato>
          <Fato rotulo="Validade">{d.dataValidade ? formatarData(d.dataValidade) : 'Sem validade'}</Fato>
          <Fato rotulo="Responsável">{d.responsavel}</Fato>
          <Fato rotulo="Vale nos projetos como">{d.exigenciaApae ? ROTULO_EXIGENCIA_APAE[d.exigenciaApae] : null}</Fato>
          <Fato rotulo="Onde está guardado">{d.localGuardado}</Fato>
          <Fato rotulo="Tags">{d.tags}</Fato>
          {!d.arquivoId ? (
            <Fato rotulo="Arquivo">
              <Typography variant="body2" color="textSecondary">
                Nenhum arquivo anexado
              </Typography>
            </Fato>
          ) : null}
        </Grid>

        {[d.descricao, d.observacoes].filter(Boolean).map((texto, i) => (
          <Typography key={i} mt={2} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {texto}
          </Typography>
        ))}

        {d.versoes.length ? (
          <>
            <Typography variant="h6" mt={3} mb={1}>
              Versões anteriores ({d.versoes.length})
            </Typography>
            <List dense disablePadding>
              {d.versoes.map((v) => (
                <ListItem
                  key={v.id}
                  disableGutters
                  secondaryAction={
                    v.arquivoId ? (
                      <Button size="small" startIcon={<IconPaperclip size={16} />} onClick={() => servicoArquivos.abrir(v.arquivoId as number)}>
                        Abrir
                      </Button>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={v.dataValidade ? `Válida até ${formatarData(v.dataValidade)}` : 'Sem validade'}
                    secondary={[
                      v.dataEmissao && `emitida em ${formatarData(v.dataEmissao)}`,
                      v.numero && `Nº ${v.numero}`,
                      `substituída em ${formatarDataHora(v.substituidaEm)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}

        <Relacionados tipo="DOCUMENTO" id={d.id} />
        <HistoricoDoRegistro carregar={() => servicoDocumentos.historico(d.id)} versao={d.atualizadoEm} />
      </Box>
    </BlankCard>
  );
};

export default DetalheDocumento;

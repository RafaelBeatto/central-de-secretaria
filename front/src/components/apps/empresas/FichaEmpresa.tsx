import { ReactNode, useEffect, useState } from 'react';
import { Box, Button, Chip, Grid, IconButton, List, ListItem, ListItemText, Stack, Tab, Tabs, Typography } from '@mui/material';
import { IconArrowLeft, IconEdit, IconPaperclip, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoEmpresas } from 'src/servicos/empresas';
import type { Empresa, EmpresaDocumento } from 'src/types/empresas';
import { ROTULO_SITUACAO, situacaoEmpresa, situacaoValidade, TOM_SITUACAO } from 'src/utils/documentos';
import { formatarData } from 'src/utils/formatacao';

type Aba = 'dados' | 'documentos' | 'historico';

const Fato = ({ rotulo, largo, children }: { rotulo: string; largo?: boolean; children: ReactNode }) => (
  <Grid item xs={12} sm={largo ? 12 : 6}>
    <Typography variant="caption" color="textSecondary" display="block">
      {rotulo}
    </Typography>
    <Box sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{children || '—'}</Box>
  </Grid>
);

interface Props {
  empresa: Empresa;
  podeAlterar: boolean;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoNovoDocumento: () => void;
  aoExcluirDocumento: (d: EmpresaDocumento) => void;
  aoFechar: () => void;
}

/**
 * Ficha da empresa ao lado da lista (no celular ocupa a tela). Abas Dados, Documentos e
 * Histórico; Cotações, Ordens de compra e Projetos entram com o módulo de Projetos.
 */
const FichaEmpresa = ({ empresa: e, podeAlterar, aoEditar, aoExcluir, aoNovoDocumento, aoExcluirDocumento, aoFechar }: Props) => {
  const [aba, setAba] = useState<Aba>('dados');
  const situacao = situacaoEmpresa(e);
  useEffect(() => setAba('dados'), [e.id]);

  const subtitulo = [e.cnpj ? `CNPJ ${e.cnpj}` : 'CNPJ não informado', e.nomeFantasia, [e.municipio, e.uf].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(' · ');

  return (
    <BlankCard>
      <Box p={{ xs: 2, md: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Button color="inherit" size="small" startIcon={<IconArrowLeft size={16} />} onClick={aoFechar} sx={{ display: { md: 'none' } }}>
            Empresas
          </Button>
          <Chip size="small" color={situacao.tom} label={situacao.rotulo} />
          <IconButton size="small" aria-label="Fechar ficha" onClick={aoFechar}>
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
          {e.razaoSocial}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {subtitulo}
        </Typography>

        {podeAlterar ? (
          <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={aoEditar}>
              Editar dados
            </Button>
            <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={aoExcluir}>
              Excluir
            </Button>
          </Stack>
        ) : null}

        <Tabs value={aba} onChange={(_, v) => setAba(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="dados" label="Dados" />
          <Tab value="documentos" label={`Documentos (${e.documentos.length})`} />
          <Tab value="historico" label="Histórico" />
        </Tabs>

        {aba === 'dados' ? (
          <Grid container spacing={2} mt={0.5}>
            <Fato rotulo="Razão social">{e.razaoSocial}</Fato>
            <Fato rotulo="Nome fantasia">{e.nomeFantasia}</Fato>
            <Fato rotulo="CNPJ">{e.cnpj}</Fato>
            <Fato rotulo="Telefone / contato">{e.telefone}</Fato>
            <Fato rotulo="E-mail">{e.email}</Fato>
            <Fato rotulo="Município / UF">{[e.municipio, e.uf].filter(Boolean).join(' / ')}</Fato>
            <Fato rotulo="Endereço" largo>
              {e.endereco}
            </Fato>
            <Fato rotulo="Representante">{e.representante}</Fato>
            <Fato rotulo="CPF do representante">{e.cpfRepresentante}</Fato>
            {e.observacao ? (
              <Fato rotulo="Observação" largo>
                {e.observacao}
              </Fato>
            ) : null}
          </Grid>
        ) : null}

        {aba === 'documentos' ? (
          <Box mt={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Documentos da própria empresa (CNPJ, contrato social, certidões…), valem para todos os projetos.
              </Typography>
              {podeAlterar ? (
                <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={aoNovoDocumento} sx={{ flexShrink: 0 }}>
                  Adicionar documento
                </Button>
              ) : null}
            </Stack>
            {e.documentos.length ? (
              <List dense disablePadding sx={{ mt: 1 }}>
                {e.documentos.map((d) => {
                  const s = situacaoValidade(d.dataValidade);
                  return (
                    <ListItem key={d.id} disableGutters sx={{ gap: 1, flexWrap: 'wrap' }}>
                      <ListItemText
                        sx={{ minWidth: 160 }}
                        primary={d.nome}
                        secondary={
                          <Stack component="span" direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip component="span" size="small" color={TOM_SITUACAO[s]} label={ROTULO_SITUACAO[s]} />
                            <span>
                              {[d.dataValidade && `válido até ${formatarData(d.dataValidade)}`, d.observacao].filter(Boolean).join(' · ')}
                            </span>
                          </Stack>
                        }
                        secondaryTypographyProps={{ component: 'span' }}
                      />
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" startIcon={<IconPaperclip size={16} />} onClick={() => servicoArquivos.abrir(d.arquivoId)}>
                          Abrir
                        </Button>
                        {podeAlterar ? (
                          <IconButton size="small" color="error" aria-label={`Excluir ${d.nome}`} onClick={() => aoExcluirDocumento(d)}>
                            <IconTrash size={16} />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary" mt={2}>
                Nenhum documento cadastrado para esta empresa.
              </Typography>
            )}
          </Box>
        ) : null}

        {aba === 'historico' ? (
          <HistoricoDoRegistro carregar={() => servicoEmpresas.historico(e.id)} versao={`${e.atualizadoEm}|${e.documentos.map((d) => d.id).join()}`} />
        ) : null}
      </Box>
    </BlankCard>
  );
};

export default FichaEmpresa;

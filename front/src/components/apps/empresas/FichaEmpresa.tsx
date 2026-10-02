import { ReactNode, useEffect, useState } from 'react';
import { Link as LinkRouter, useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Grid, IconButton, Link, List, ListItem, ListItemText, Stack, Tab, Tabs, Typography } from '@mui/material';
import { IconArrowLeft, IconArrowRight, IconEdit, IconFilePencil, IconLink, IconPaperclip, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import Relacionados from 'src/components/compartilhados/Relacionados';
import { PERMISSOES } from 'src/constantes/permissoes';
import { usePermissao } from 'src/hooks/usePermissao';
import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoEmpresas } from 'src/servicos/empresas';
import { servicoProjetos } from 'src/servicos/projetos';
import { EmpresaNosProjetos, ROTULO_STATUS_ORDEM } from 'src/types/projetos';
import { formatarMoeda } from 'src/utils/projetos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { ChipStatus } from 'src/components/apps/projetos/Comuns';
import { DialogoEscolherExecucao } from 'src/components/apps/projetos/DialogosProjeto';
import type { Empresa, EmpresaDocumento } from 'src/types/empresas';
import { ROTULO_SITUACAO, situacaoEmpresa, situacaoValidade, TOM_SITUACAO } from 'src/utils/documentos';
import { formatarData } from 'src/utils/formatacao';

type Aba = 'dados' | 'documentos' | 'cotacoes' | 'ordens' | 'projetos' | 'historico';
const ABAS_PROJETOS: Aba[] = ['cotacoes', 'ordens', 'projetos'];

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
  /** Abas de projetos só para quem lê projetos; "Ligar a um projeto" para quem altera. */
  verProjetos: boolean;
  ligarProjetos: boolean;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoNovoDocumento: () => void;
  aoExcluirDocumento: (d: EmpresaDocumento) => void;
  aoFechar: () => void;
}

/**
 * Ficha da empresa ao lado da lista (no celular ocupa a tela): Dados, Documentos, Cotações,
 * Ordens de compra, Projetos e Histórico (old: abrirFichaEmpresaGlobal).
 */
const FichaEmpresa = ({ empresa: e, podeAlterar, verProjetos, ligarProjetos, aoEditar, aoExcluir, aoNovoDocumento, aoExcluirDocumento, aoFechar }: Props) => {
  const navegar = useNavigate();
  const gerarDocumento = usePermissao().podeAlterar(PERMISSOES.GERADOR_ESCREVER);
  const [aba, setAba] = useState<Aba>('dados');
  const [projetos, setProjetos] = useState<EmpresaNosProjetos | null>(null);
  const [erroProjetos, setErroProjetos] = useState<string | null>(null);
  const [ligando, setLigando] = useState(false);
  const situacao = situacaoEmpresa(e);
  const carregarProjetos = () =>
    servicoProjetos
      .daEmpresa(e.id)
      .then(setProjetos)
      .catch((x) => setErroProjetos(mensagemDeErro(x)));
  useEffect(() => {
    setAba('dados');
    setProjetos(null);
    setErroProjetos(null);
  }, [e.id]);
  useEffect(() => {
    if (verProjetos && ABAS_PROJETOS.includes(aba) && !projetos) carregarProjetos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, verProjetos, projetos]);

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
            {ligarProjetos ? (
              <Button size="small" variant="outlined" startIcon={<IconLink size={16} />} onClick={() => setLigando(true)}>
                Ligar a um projeto
              </Button>
            ) : null}
            {gerarDocumento ? (
              <Button size="small" variant="outlined" startIcon={<IconFilePencil size={16} />} onClick={() => navegar(`/gerador?vinculoTipo=EMPRESA&vinculoId=${e.id}`)}>
                Gerar documento
              </Button>
            ) : null}
            <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={aoExcluir}>
              Excluir
            </Button>
          </Stack>
        ) : null}

        <Tabs value={aba} onChange={(_, v) => setAba(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="dados" label="Dados" />
          <Tab value="documentos" label={`Documentos (${e.documentos.length})`} />
          {verProjetos ? <Tab value="cotacoes" label={`Cotações${projetos ? ` (${projetos.cotacoes.length})` : ''}`} /> : null}
          {verProjetos ? <Tab value="ordens" label={`Ordens de compra${projetos ? ` (${projetos.ordens.length})` : ''}`} /> : null}
          {verProjetos ? <Tab value="projetos" label={`Projetos${projetos ? ` (${projetos.execucoes.length})` : ''}`} /> : null}
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

        {ABAS_PROJETOS.includes(aba) ? (
          <Box mt={2}>
            {erroProjetos ? <Typography color="error">{erroProjetos}</Typography> : null}
            {!projetos && !erroProjetos ? <Typography color="textSecondary">Carregando…</Typography> : null}
            {projetos && aba === 'cotacoes' ? (
              <ListaProjetos
                vazio="Nenhuma cotação desta empresa ainda."
                itens={projetos.cotacoes.map((c) => ({
                  id: c.id,
                  titulo: `${formatarMoeda(c.valorTotal)}${c.vencedora ? ' · vencedora' : ''}`,
                  detalhe: `${c.data ? formatarData(c.data) : 'sem data'} · ${c.execucaoNome}`,
                  arquivoId: c.arquivoId,
                  execucaoId: c.execucaoId,
                }))}
              />
            ) : null}
            {projetos && aba === 'ordens' ? (
              <ListaProjetos
                vazio="Nenhuma ordem de compra para esta empresa ainda. Só a empresa com a cotação vencedora recebe a ordem."
                itens={projetos.ordens.map((o) => ({
                  id: o.id,
                  titulo: `${o.numero} · ${formatarMoeda(o.valor)}`,
                  detalhe: [o.data && formatarData(o.data), ROTULO_STATUS_ORDEM[o.status], o.execucaoNome].filter(Boolean).join(' · '),
                  arquivoId: o.arquivoId,
                  execucaoId: o.execucaoId,
                }))}
              />
            ) : null}
            {projetos && aba === 'projetos' ? (
              projetos.execucoes.length ? (
                <List dense disablePadding>
                  {projetos.execucoes.map((x) => (
                    <ListItem key={x.id} disableGutters secondaryAction={<ChipStatus status={x.status} />}>
                      <ListItemText
                        primary={
                          <Link component={LinkRouter} to={`/projetos?execucao=${x.id}`} underline="hover">
                            {x.nome}
                          </Link>
                        }
                        secondary={x.recursoNome}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Esta empresa ainda não está ligada a nenhum projeto.{ligarProjetos ? ' Use “Ligar a um projeto” acima.' : ''}
                </Typography>
              )
            ) : null}
          </Box>
        ) : null}

        {aba === 'historico' ? (
          <>
            <Relacionados tipo="EMPRESA" id={e.id} />
            <HistoricoDoRegistro carregar={() => servicoEmpresas.historico(e.id)} versao={`${e.atualizadoEm}|${e.documentos.map((d) => d.id).join()}`} />
          </>
        ) : null}
      </Box>
      <DialogoEscolherExecucao aberto={ligando} empresa={e} aoFechar={() => setLigando(false)} aoLigar={carregarProjetos} />
    </BlankCard>
  );
};

/** Cotações e ordens da empresa em todos os projetos, com o arquivo e o atalho para a execução. */
const ListaProjetos = ({ itens, vazio }: { itens: { id: number; titulo: string; detalhe: string; arquivoId: number; execucaoId: number }[]; vazio: string }) =>
  itens.length ? (
    <List dense disablePadding>
      {itens.map((i) => (
        <ListItem key={i.id} disableGutters sx={{ gap: 1, flexWrap: 'wrap' }}>
          <ListItemText sx={{ minWidth: 160 }} primary={i.titulo} secondary={i.detalhe} />
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<IconPaperclip size={16} />} onClick={() => servicoArquivos.abrir(i.arquivoId)}>
              Abrir
            </Button>
            <Button size="small" component={LinkRouter} to={`/projetos?execucao=${i.execucaoId}&secao=empresas`} endIcon={<IconArrowRight size={16} />}>
              Ver projeto
            </Button>
          </Stack>
        </ListItem>
      ))}
    </List>
  ) : (
    <Typography variant="body2" color="textSecondary">
      {vazio}
    </Typography>
  );

export default FichaEmpresa;

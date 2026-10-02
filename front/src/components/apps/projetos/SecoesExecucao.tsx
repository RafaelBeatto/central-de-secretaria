import { Link as LinkRouter } from 'react-router-dom';
import { Alert, Box, Button, Chip, Grid, IconButton, Paper, Stack, Typography } from '@mui/material';
import { IconArrowRight, IconCheck, IconPlus, IconRotate, IconTrash, IconX } from '@tabler/icons-react';
import { COR_PRIORIDADE, ROTULO_PRIORIDADE } from 'src/types/comum';
import { ROTULO_EXIGENCIA_APAE } from 'src/types/documentos';
import { ExecucaoDetalhe, ROTULO_CATEGORIA_DOC_EXECUCAO, ROTULO_STATUS_ORDEM, SecaoExecucao } from 'src/types/projetos';
import { prazoTexto, situacaoEmpresa, situacaoValidade } from 'src/utils/documentos';
import { formatarData } from 'src/utils/formatacao';
import { empresasCotadas, formatarMoeda } from 'src/utils/projetos';
import { BotaoArquivo, CabecalhoSecao, LinhaItem, Numeros, Vazio } from './Comuns';

/** Ações das seções; cada uma abre um diálogo ou chama a API na tela da execução. */
export interface AcoesExecucao {
  ir: (secao: SecaoExecucao) => void;
  plano: () => void;
  vincularEmpresa: () => void;
  removerEmpresa: (vinculoId: number, nome: string) => void;
  novaCotacao: (empresaId: number) => void;
  escolherVencedora: (cotacaoId: number) => void;
  excluirCotacao: (cotacaoId: number, descricao: string) => void;
  novaOrdem: () => void;
  excluirOrdem: (ordemId: number, numero: string) => void;
  renovarDocumentoApae: (documentoId: number) => void;
  novoDocumento: () => void;
  excluirDocumento: (id: number, nome: string) => void;
  novoPagamento: () => void;
  excluirPagamento: (id: number, descricao: string) => void;
  novaPendencia: () => void;
  concluirPendencia: (id: number, concluida: boolean) => void;
  excluirPendencia: (id: number) => void;
}

interface Props {
  execucao: ExecucaoDetalhe;
  podeAlterar: boolean;
  podeRenovarDocumentos: boolean;
  acoes: AcoesExecucao;
}

export const SecaoResumo = ({ execucao: e, acoes }: Props) => {
  const s = e.situacao;
  const comprometido = e.cotacoes.filter((c) => c.vencedora).reduce((t, c) => t + c.valorTotal, 0);
  const fato = (rotulo: string, valor: string | null, largo = false) => (
    <Grid item xs={12} sm={largo ? 12 : 6}>
      <Typography variant="caption" color="textSecondary" display="block">
        {rotulo}
      </Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{valor || '—'}</Typography>
    </Grid>
  );
  return (
    <>
      {s.proximoPasso ? (
        <Alert
          severity="info"
          action={
            <Button size="small" variant="contained" endIcon={<IconArrowRight size={16} />} onClick={() => acoes.ir(s.proximoPasso!.secao)}>
              Resolver agora
            </Button>
          }
        >
          Próximo passo: <strong>{s.proximoPasso.rotulo}</strong>
        </Alert>
      ) : (
        <Alert severity="success">
          Todas as {s.etapas.length} etapas estão registradas. A conferência humana e as regras do financiador continuam sendo necessárias.
        </Alert>
      )}
      <Box mt={3}>
        <Numeros
          itens={[
            { rotulo: 'Planejado', valor: s.planejado },
            { rotulo: 'Comprometido', valor: comprometido, nota: 'cotação vencedora' },
            { rotulo: 'Pago', valor: s.pago, nota: `${s.percentualPago}% do planejado` },
            { rotulo: 'Saldo', valor: s.saldo, destaque: true },
          ]}
        />
        <Box mt={1.5} height={10} borderRadius={5} overflow="hidden" bgcolor="grey.200" role="img" aria-label={`${s.percentualPago}% do planejado já foi pago`}>
          <Box height="100%" width={`${Math.min(100, s.percentualPago)}%`} bgcolor="primary.dark" />
        </Box>
      </Box>
      <Typography variant="h6" mt={3} mb={1}>
        Dados da execução
      </Typography>
      <Grid container spacing={2}>
        {fato('Fonte', e.fonteRecurso)}
        {fato('Convênio / instrumento', e.convenio)}
        {fato('Período', `${formatarData(e.dataInicio)} → ${formatarData(e.dataFim)}`)}
        {fato('Responsável', e.responsavel)}
        {fato('Objetivo', e.objetivo, true)}
        {e.observacoes ? fato('Observações', e.observacoes, true) : null}
      </Grid>
    </>
  );
};

export const SecaoPlano = ({ execucao: e, podeAlterar, acoes }: Props) => {
  const tem = e.planoDescricao || e.planoArquivoId;
  return (
    <>
      <CabecalhoSecao
        titulo="Plano de aplicação"
        texto="O que será feito com o dinheiro. Antes de comprar, confira se o item está previsto aqui e se o valor é compatível."
        acoes={podeAlterar ? <Button size="small" variant="contained" onClick={acoes.plano}>{tem ? 'Editar plano' : 'Registrar plano'}</Button> : null}
      />
      {tem ? (
        <>
          {e.planoDescricao ? <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{e.planoDescricao}</Typography> : null}
          {e.planoArquivoId ? <LinhaItem titulo="Plano aprovado (arquivo)" acoes={<BotaoArquivo arquivoId={e.planoArquivoId} />} /> : null}
        </>
      ) : (
        <Vazio>O plano ainda não foi registrado.</Vazio>
      )}
    </>
  );
};

/** Empresas e compras: cotações de ≥3 empresas, vencedora e ordem de compra só para ela. */
export const SecaoEmpresas = ({ execucao: e, podeAlterar, acoes }: Props) => {
  const faltam = Math.max(0, 3 - empresasCotadas(e.cotacoes));
  const vencedora = e.cotacoes.find((c) => c.vencedora);
  const regra = faltam
    ? `Faltam cotações de ${faltam} empresa(s) para poder escolher a vencedora.`
    : vencedora
      ? 'Cotações completas. A ordem de compra sai para a empresa vencedora.'
      : 'Cotações completas — escolha a vencedora.';
  return (
    <>
      <CabecalhoSecao
        titulo="Empresas e compras"
        texto={regra}
        acoes={podeAlterar ? <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={acoes.vincularEmpresa}>Ligar empresa</Button> : null}
      />
      {!e.empresas.length ? <Vazio>Nenhuma empresa ainda. Ligue pelo menos 3 fornecedores para cotar.</Vazio> : null}
      <Stack spacing={2}>
        {e.empresas.map(({ vinculoId, empresa }) => {
          const cotacoes = e.cotacoes.filter((c) => c.empresaId === empresa.id);
          const ehVencedora = cotacoes.some((c) => c.vencedora);
          const ordens = e.ordens.filter((o) => cotacoes.some((c) => c.id === o.cotacaoId));
          const doc = situacaoEmpresa(empresa);
          return (
            <Paper key={vinculoId} variant="outlined" sx={{ p: 2, borderColor: ehVencedora ? 'success.main' : 'divider' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                <Box minWidth={0}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
                    {empresa.razaoSocial}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {[empresa.cnpj || 'CNPJ não informado', empresa.telefone].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                  {ehVencedora ? <Chip size="small" color="success" icon={<IconCheck size={14} />} label="Vencedora" /> : null}
                  <Chip size="small" color={doc.tom} label={doc.rotulo} component={LinkRouter} to={`/empresas?empresa=${empresa.id}`} clickable />
                </Stack>
              </Stack>
              <Grid container spacing={2} mt={0.5}>
                <Grid item xs={12} md={6}>
                  <Typography variant="overline">Cotações</Typography>
                  {cotacoes.length ? (
                    cotacoes.map((c) => (
                      <LinhaItem
                        key={c.id}
                        titulo={formatarMoeda(c.valorTotal)}
                        detalhe={[c.data ? formatarData(c.data) : 'Sem data', c.itens.map((i) => i.descricao).join(', ')].filter(Boolean).join(' · ')}
                        acoes={
                          <>
                            <BotaoArquivo arquivoId={c.arquivoId} />
                            {podeAlterar && !c.vencedora ? (
                              <Button size="small" disabled={faltam > 0} title={faltam ? 'Precisa de cotações de 3 empresas' : undefined} onClick={() => acoes.escolherVencedora(c.id)}>
                                Escolher
                              </Button>
                            ) : null}
                            {podeAlterar ? (
                              <IconButton size="small" color="error" aria-label="Excluir cotação" onClick={() => acoes.excluirCotacao(c.id, `a cotação de ${empresa.razaoSocial} (${formatarMoeda(c.valorTotal)})`)}>
                                <IconTrash size={16} />
                              </IconButton>
                            ) : null}
                          </>
                        }
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Nenhuma cotação.
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="overline">Ordens de compra</Typography>
                  {ordens.length ? (
                    ordens.map((o) => (
                      <LinhaItem
                        key={o.id}
                        titulo={o.numero}
                        detalhe={`${formatarMoeda(o.valor)} · ${ROTULO_STATUS_ORDEM[o.status]}${o.data ? ` · ${formatarData(o.data)}` : ''}`}
                        acoes={
                          <>
                            <BotaoArquivo arquivoId={o.arquivoId} />
                            {podeAlterar ? (
                              <IconButton size="small" color="error" aria-label="Excluir ordem" onClick={() => acoes.excluirOrdem(o.id, o.numero)}>
                                <IconTrash size={16} />
                              </IconButton>
                            ) : null}
                          </>
                        }
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      {ehVencedora ? 'Nenhuma ordem emitida ainda.' : 'Só a empresa vencedora recebe ordem.'}
                    </Typography>
                  )}
                </Grid>
              </Grid>
              {podeAlterar ? (
                <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={() => acoes.novaCotacao(empresa.id)}>
                    Cotação
                  </Button>
                  {ehVencedora ? (
                    <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} disabled={faltam > 0} onClick={acoes.novaOrdem}>
                      Ordem de compra
                    </Button>
                  ) : null}
                  <Box flexGrow={1} />
                  <Button size="small" color="error" startIcon={<IconX size={16} />} onClick={() => acoes.removerEmpresa(vinculoId, empresa.razaoSocial)}>
                    Remover desta execução
                  </Button>
                </Stack>
              ) : null}
            </Paper>
          );
        })}
      </Stack>
    </>
  );
};

/** Os documentos são da APAE e ficam em Documentos: cadastrou ou renovou lá, vale para todas as execuções. */
export const SecaoDocsApae = ({ execucao: e, podeRenovarDocumentos, acoes }: Props) => {
  const emDia = e.documentacaoApae.filter((d) => d.ok).length;
  return (
    <>
      <CabecalhoSecao
        titulo="Documentação da APAE"
        texto={`${emDia} de ${e.documentacaoApae.length} em dia. Estes documentos são da APAE e ficam em Documentos: cadastrou ou renovou lá, vale para todas as execuções.`}
        acoes={<Button size="small" variant="outlined" component={LinkRouter} to="/documentos" endIcon={<IconArrowRight size={16} />}>Abrir Documentos</Button>}
      />
      {e.documentacaoApae.map((d) => {
        const s = d.documentoId ? situacaoValidade(d.dataValidade) : null;
        return (
          <LinhaItem
            key={d.exigencia}
            titulo={
              <Box component="span" display="flex" alignItems="center" gap={1}>
                <Box component="span" color={d.ok ? 'success.main' : d.documentoId ? 'error.main' : 'text.secondary'}>
                  {d.ok ? '✓' : d.documentoId ? '!' : '○'}
                </Box>
                {ROTULO_EXIGENCIA_APAE[d.exigencia]}
              </Box>
            }
            detalhe={d.documentoId ? `${d.nome} · ${prazoTexto(d.dataValidade)}${d.arquivoId ? '' : ' · sem arquivo'}` : 'Não cadastrado em Documentos'}
            acoes={
              d.documentoId ? (
                <>
                  <BotaoArquivo arquivoId={d.arquivoId} />
                  <Button size="small" component={LinkRouter} to={`/documentos?documento=${d.documentoId}`}>
                    Ver
                  </Button>
                  {podeRenovarDocumentos && (s === 'vencido' || s === 'vencendo') ? (
                    <Button size="small" variant={s === 'vencido' ? 'contained' : 'outlined'} startIcon={<IconRotate size={16} />} onClick={() => acoes.renovarDocumentoApae(d.documentoId!)}>
                      Renovar
                    </Button>
                  ) : null}
                </>
              ) : podeRenovarDocumentos ? (
                <Button size="small" variant="contained" component={LinkRouter} to={`/documentos?exigencia=${d.exigencia}`}>
                  Cadastrar
                </Button>
              ) : null
            }
          />
        );
      })}
    </>
  );
};

export const SecaoDocumentos = ({ execucao: e, podeAlterar, acoes }: Props) => (
  <>
    <CabecalhoSecao
      titulo="Notas e documentos"
      texto="Notas fiscais, comprovantes, relatórios e declarações da execução. Uma nota fiscal conclui a etapa."
      acoes={podeAlterar ? <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={acoes.novoDocumento}>Anexar documento</Button> : null}
    />
    {e.documentos.length ? (
      e.documentos.map((d) => (
        <LinhaItem
          key={d.id}
          titulo={d.nome}
          detalhe={`${ROTULO_CATEGORIA_DOC_EXECUCAO[d.categoria]} · ${d.data ? formatarData(d.data) : 'Sem data'}`}
          acoes={
            <>
              <BotaoArquivo arquivoId={d.arquivoId} />
              {podeAlterar ? (
                <IconButton size="small" color="error" aria-label={`Excluir ${d.nome}`} onClick={() => acoes.excluirDocumento(d.id, d.nome)}>
                  <IconTrash size={16} />
                </IconButton>
              ) : null}
            </>
          }
        />
      ))
    ) : (
      <Vazio>Nenhum documento anexado.</Vazio>
    )}
  </>
);

export const SecaoPagamentos = ({ execucao: e, podeAlterar, acoes }: Props) => (
  <>
    <CabecalhoSecao
      titulo="Pagamentos"
      texto={`Pago ${formatarMoeda(e.situacao.pago)} de ${formatarMoeda(e.situacao.planejado)} planejados. Cada pagamento alimenta o saldo da execução e do recurso.`}
      acoes={podeAlterar ? <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={acoes.novoPagamento}>Registrar pagamento</Button> : null}
    />
    {e.pagamentos.length ? (
      e.pagamentos.map((p) => {
        const descricao = `o pagamento de ${formatarMoeda(p.valor)}${p.fornecedor ? ` a ${p.fornecedor}` : ''} (${formatarData(p.data)})`;
        return (
          <LinhaItem
            key={p.id}
            titulo={`${formatarMoeda(p.valor)} — ${p.fornecedor || 'Pagamento'}`}
            detalhe={`${p.data ? formatarData(p.data) : 'Sem data'} · ${p.forma || 'Forma não informada'}`}
            acoes={
              <>
                <BotaoArquivo arquivoId={p.arquivoId} rotulo="Comprovante" />
                {podeAlterar ? (
                  <IconButton size="small" color="error" aria-label="Excluir pagamento" onClick={() => acoes.excluirPagamento(p.id, descricao)}>
                    <IconTrash size={16} />
                  </IconButton>
                ) : null}
              </>
            }
          />
        );
      })
    ) : (
      <Vazio>Nenhum pagamento registrado.</Vazio>
    )}
  </>
);

export const SecaoPendencias = ({ execucao: e, podeAlterar, acoes }: Props) => (
  <>
    <CabecalhoSecao
      titulo="Pendências"
      texto="Para algo específico que precisa ser resolvido e não é uma etapa do processo."
      acoes={podeAlterar ? <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={acoes.novaPendencia}>Nova pendência</Button> : null}
    />
    {e.pendencias.length ? (
      e.pendencias.map((p) => (
        <LinhaItem
          key={p.id}
          apagado={p.concluida}
          titulo={p.titulo}
          detalhe={
            <Stack direction="row" spacing={1} alignItems="center" component="span" flexWrap="wrap" useFlexGap>
              <Chip component="span" size="small" color={COR_PRIORIDADE[p.prioridade]} label={ROTULO_PRIORIDADE[p.prioridade]} />
              <span>{[p.concluida ? 'Concluída' : 'Pendente', p.descricao].filter(Boolean).join(' · ')}</span>
            </Stack>
          }
          acoes={
            podeAlterar ? (
              <>
                <Button size="small" startIcon={p.concluida ? <IconRotate size={16} /> : <IconCheck size={16} />} onClick={() => acoes.concluirPendencia(p.id, !p.concluida)}>
                  {p.concluida ? 'Reabrir' : 'Concluir'}
                </Button>
                <IconButton size="small" color="error" aria-label="Excluir pendência" onClick={() => acoes.excluirPendencia(p.id)}>
                  <IconTrash size={16} />
                </IconButton>
              </>
            ) : null
          }
        />
      ))
    ) : (
      <Vazio>Nenhuma pendência.</Vazio>
    )}
  </>
);

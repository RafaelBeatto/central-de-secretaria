import { ReactNode, useState } from 'react';
import { Box, Breadcrumbs, Button, Chip, Grid, IconButton, Link, Stack, Tab, Tabs, Typography } from '@mui/material';
import { IconArchive, IconArrowsExchange, IconEdit, IconFileTypePdf, IconPlus, IconRotate, IconTrash } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoProjetos } from 'src/servicos/projetos';
import { ExecucaoDetalhe, RecursoDetalhe, ROTULO_MOVIMENTACAO } from 'src/types/projetos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData } from 'src/utils/formatacao';
import { formatarMoeda } from 'src/utils/projetos';
import { BotaoArquivo, CabecalhoSecao, ChipStatus, LinhaItem, MedidorRecurso, Numeros, Vazio } from './Comuns';
import { DialogoDocumentoRecurso, DialogoTransferencia } from './DialogosProjeto';
import { FormularioExecucao, FormularioRecurso } from './FormulariosProjeto';
import LinhaExecucao from './LinhaExecucao';
import { gerarRelatorioRecurso } from './relatorioRecurso';

type Aba = 'execucoes' | 'documentos' | 'historico';
type Dialogo = 'editar' | 'execucao' | 'documento' | 'transferir' | null;

interface Props {
  recurso: RecursoDetalhe;
  podeAlterar: boolean;
  aoAtualizar: (r: RecursoDetalhe) => void;
  aoAbrirExecucao: (id: number) => void;
  aoExecucaoCriada: (e: ExecucaoDetalhe) => void;
  aoVoltar: () => void;
}

const Dado = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <Box mb={1.5}>
    <Typography variant="caption" color="textSecondary" display="block">
      {rotulo}
    </Typography>
    <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{children || '—'}</Typography>
  </Box>
);

/** Nível 2: o recurso com o financeiro, as execuções, os documentos e o histórico (old: pjRecursoHTML). */
const TelaRecurso = ({ recurso: r, podeAlterar, aoAtualizar, aoAbrirExecucao, aoExecucaoCriada, aoVoltar }: Props) => {
  const { notificar, confirmar } = useInteracao();
  const [aba, setAba] = useState<Aba>('execucoes');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [gerando, setGerando] = useState(false);
  const f = r.financeiro;
  const alterar = podeAlterar && !r.arquivado;
  const fechar = () => setDialogo(null);
  const salvo = (mensagem: string) => (novo: RecursoDetalhe) => {
    aoAtualizar(novo);
    notificar(mensagem);
  };

  const executar = async (acao: () => Promise<unknown>, pergunta: string, perigo = false) => {
    if (!(await confirmar(pergunta, { rotuloConfirmar: 'Confirmar', perigo }))) return false;
    try {
      await acao();
      return true;
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
      return false;
    }
  };

  const arquivar = () =>
    executar(
      async () => salvo(r.arquivado ? 'Recurso reaberto.' : 'Recurso arquivado.')(await servicoProjetos.arquivar(r.id, !r.arquivado)),
      r.arquivado ? 'Reabrir este recurso na lista principal?' : 'Arquivar este recurso? Ele sai da lista principal, mas continua disponível e pode ser reaberto depois.',
    );

  const excluir = async () => {
    if (r.execucoes.length) {
      notificar('Exclua as execuções deste recurso antes (ou prefira "Arquivar").', 'warning');
      return;
    }
    if (await executar(() => servicoProjetos.excluirRecurso(r.id), `Excluir o recurso "${r.nome}"? Se ele só estiver encerrado, prefira "Arquivar".`, true)) {
      notificar('Recurso excluído.');
      aoVoltar();
    }
  };

  const relatorio = async () => {
    setGerando(true);
    try {
      await gerarRelatorioRecurso(r);
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    } finally {
      setGerando(false);
    }
  };

  const transferir = () => {
    if (r.execucoes.filter((e) => e.status !== 'CANCELADO').length < 2) {
      notificar('É preciso ter pelo menos 2 execuções ativas para transferir saldo.', 'warning');
      return;
    }
    setDialogo('transferir');
  };

  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component="button" underline="hover" onClick={aoVoltar}>
          Projetos
        </Link>
        <Typography color="textPrimary">{r.nome}</Typography>
      </Breadcrumbs>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} mb={2}>
        <Box minWidth={0}>
          <Typography variant="caption" color="textSecondary">
            {r.codigo} · Recurso
          </Typography>
          <Typography variant="h4" sx={{ overflowWrap: 'anywhere' }}>
            {r.nome}
          </Typography>
          <Typography color="textSecondary">{[r.fonteRecurso, r.orgaoRepassador, r.convenio].filter(Boolean).join(' · ')}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <ChipStatus status={r.status} />
          {r.arquivado ? <Chip size="small" label="Arquivado" /> : null}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" useFlexGap>
        {alterar ? (
          <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setDialogo('execucao')}>
            Nova execução
          </Button>
        ) : null}
        {alterar ? (
          <>
            <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={() => setDialogo('editar')}>
              Editar
            </Button>
            <Button size="small" variant="outlined" startIcon={<IconArrowsExchange size={16} />} onClick={transferir}>
              Transferir saldo
            </Button>
          </>
        ) : null}
        <Button size="small" variant="outlined" startIcon={<IconFileTypePdf size={16} />} disabled={gerando} onClick={relatorio}>
          {gerando ? 'Gerando…' : 'Relatório em PDF'}
        </Button>
        {podeAlterar ? (
          <>
            <Button size="small" variant="outlined" startIcon={r.arquivado ? <IconRotate size={16} /> : <IconArchive size={16} />} onClick={arquivar}>
              {r.arquivado ? 'Reabrir' : 'Arquivar'}
            </Button>
            <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={excluir}>
              Excluir
            </Button>
          </>
        ) : null}
      </Stack>

      <BlankCard>
        <Box p={{ xs: 2, md: 3 }}>
          <Numeros
            itens={[
              { rotulo: 'Recebido', valor: f.recebido },
              { rotulo: 'Distribuído', valor: f.distribuido, nota: `${f.percentualDistribuicao}% do recebido` },
              { rotulo: 'Pago', valor: f.pago, nota: `${f.percentualExecucao}% do distribuído` },
              { rotulo: 'Disponível', valor: f.disponivel, nota: 'livre + saldo das execuções', destaque: true },
            ]}
          />
          <MedidorRecurso f={f} />
        </Box>
      </BlankCard>

      <Grid container spacing={3} mt={0}>
        <Grid item xs={12} md={8}>
          <Tabs value={aba} onChange={(_, v) => setAba(v)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab value="execucoes" label={`Execuções (${r.execucoes.length})`} />
            <Tab value="documentos" label={`Documentos (${r.documentos.length})`} />
            <Tab value="historico" label="Histórico" />
          </Tabs>

          {aba === 'execucoes' ? (
            r.execucoes.length ? (
              <>
                {r.execucoes.map((e) => (
                  <LinhaExecucao key={e.id} execucao={e} mostrarSaldo aoAbrir={() => aoAbrirExecucao(e.id)} />
                ))}
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Livre para novas execuções: <strong>{formatarMoeda(f.naoDistribuido)}</strong>
                </Typography>
              </>
            ) : (
              <Vazio>Nenhuma execução ainda. {formatarMoeda(f.naoDistribuido)} livres para distribuir.</Vazio>
            )
          ) : null}

          {aba === 'documentos' ? (
            <>
              <CabecalhoSecao
                titulo="Documentos do recurso"
                texto="Termo, convênio, plano geral, comprovante de recebimento — o que vale para o recurso inteiro. Documentos de cada compra ficam dentro da execução."
                acoes={alterar ? <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setDialogo('documento')}>Adicionar</Button> : null}
              />
              {r.documentos.length ? (
                r.documentos.map((d) => (
                  <LinhaItem
                    key={d.id}
                    titulo={d.nome}
                    detalhe={[formatarData(d.data), d.observacao].filter(Boolean).join(' · ')}
                    acoes={
                      <>
                        <BotaoArquivo arquivoId={d.arquivoId} />
                        {alterar ? (
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Excluir ${d.nome}`}
                            onClick={() =>
                              executar(async () => salvo('Documento excluído.')(await servicoProjetos.excluirDocumentoRecurso(r.id, d.id)), 'Excluir este documento do recurso?', true)
                            }
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        ) : null}
                      </>
                    }
                  />
                ))
              ) : (
                <Vazio>Nenhum documento do recurso ainda.</Vazio>
              )}
            </>
          ) : null}

          {aba === 'historico' ? (
            <>
              <CabecalhoSecao titulo="Movimentações financeiras" texto="Registro permanente: entradas, distribuições, transferências e ajustes nunca mudam “por baixo”." />
              {r.movimentacoes.map((m) => (
                <LinhaItem
                  key={m.id}
                  titulo={ROTULO_MOVIMENTACAO[m.tipo]}
                  detalhe={[formatarData(m.data), m.descricao].filter(Boolean).join(' · ')}
                  acoes={
                    <Typography variant="body2" fontWeight={600} color={m.valor < 0 ? 'error.main' : 'textPrimary'}>
                      {formatarMoeda(m.valor)}
                    </Typography>
                  }
                />
              ))}
              <HistoricoDoRegistro carregar={() => servicoProjetos.historicoRecurso(r.id)} versao={r.atualizadoEm + r.movimentacoes.length} />
            </>
          ) : null}
        </Grid>
        <Grid item xs={12} md={4}>
          <BlankCard>
            <Box p={{ xs: 2, md: 3 }}>
              <Typography variant="h6" mb={1.5}>
                Dados do recurso
              </Typography>
              <Dado rotulo="Recebido em">{r.dataRecebimento ? formatarData(r.dataRecebimento) : null}</Dado>
              <Dado rotulo="Período">{`${formatarData(r.dataInicio)} → ${formatarData(r.dataFim)}`}</Dado>
              <Dado rotulo="Convênio / termo">{r.convenio}</Dado>
              <Dado rotulo="Conta bancária">{r.contaBancaria}</Dado>
              <Dado rotulo="Responsável">{r.responsavel}</Dado>
              <Dado rotulo="Finalidade">{r.finalidade}</Dado>
              {r.observacoes ? <Dado rotulo="Observações">{r.observacoes}</Dado> : null}
            </Box>
          </BlankCard>
        </Grid>
      </Grid>

      <FormularioRecurso aberto={dialogo === 'editar'} recurso={r} aoFechar={fechar} aoSalvar={salvo('Alterações salvas.')} />
      <FormularioExecucao
        aberto={dialogo === 'execucao'}
        execucao={null}
        recurso={{ id: r.id, nome: r.nome, fonteRecurso: r.fonteRecurso, responsavel: r.responsavel, livre: f.naoDistribuido }}
        aoFechar={fechar}
        aoSalvar={(e) => {
          notificar('Execução cadastrada.');
          aoExecucaoCriada(e);
        }}
      />
      <DialogoDocumentoRecurso recurso={dialogo === 'documento' ? r : null} aoFechar={fechar} aoSalvar={salvo('Documento adicionado.')} />
      <DialogoTransferencia recurso={dialogo === 'transferir' ? r : null} aoFechar={fechar} aoSalvar={salvo('Saldo transferido.')} />
    </>
  );
};

export default TelaRecurso;

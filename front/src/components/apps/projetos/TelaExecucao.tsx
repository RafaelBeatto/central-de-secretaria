import { useState } from 'react';
import { Box, Breadcrumbs, Button, Chip, Grid, Link, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tab, Tabs, Theme, Typography, useMediaQuery } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import Relacionados from 'src/components/compartilhados/Relacionados';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import DialogoRenovarDocumento from 'src/components/apps/documentos/DialogoRenovarDocumento';
import { servicoDocumentos } from 'src/servicos/documentos';
import { servicoProjetos } from 'src/servicos/projetos';
import type { Documento } from 'src/types/documentos';
import type { ExecucaoDetalhe, SecaoExecucao } from 'src/types/projetos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData } from 'src/utils/formatacao';
import { ChipStatus } from './Comuns';
import { FormularioExecucao } from './FormulariosProjeto';
import { DialogoCotacao, DialogoDocumentoExecucao, DialogoOrdem, DialogoPagamento, DialogoPendencia, DialogoPlano, DialogoVincularEmpresa } from './DialogosProjeto';
import { AcoesExecucao, SecaoDocsApae, SecaoDocumentos, SecaoEmpresas, SecaoPagamentos, SecaoPendencias, SecaoPlano, SecaoResumo } from './SecoesExecucao';

/** Seções da execução: as do meio são as etapas do processo (a navegação É o checklist). */
const SECOES: { chave: SecaoExecucao; rotulo: string; etapa?: boolean }[] = [
  { chave: 'resumo', rotulo: 'Resumo' },
  { chave: 'plano', rotulo: 'Plano de aplicação', etapa: true },
  { chave: 'empresas', rotulo: 'Empresas e compras', etapa: true },
  { chave: 'docs-apae', rotulo: 'Documentação da APAE', etapa: true },
  { chave: 'documentos', rotulo: 'Notas e documentos', etapa: true },
  { chave: 'pagamentos', rotulo: 'Pagamentos', etapa: true },
  { chave: 'pendencias', rotulo: 'Pendências' },
];
const CONTEUDO = { resumo: SecaoResumo, plano: SecaoPlano, empresas: SecaoEmpresas, 'docs-apae': SecaoDocsApae, documentos: SecaoDocumentos, pagamentos: SecaoPagamentos, pendencias: SecaoPendencias };

type Dialogo = 'editar' | 'plano' | 'empresa' | 'cotacao' | 'ordem' | 'documento' | 'pagamento' | 'pendencia' | null;

interface Props {
  execucao: ExecucaoDetalhe;
  secao: SecaoExecucao;
  podeAlterar: boolean;
  podeRenovarDocumentos: boolean;
  aoTrocarSecao: (s: SecaoExecucao) => void;
  aoAtualizar: (e: ExecucaoDetalhe) => void;
  aoIrPara: (destino: { recurso?: number } | null) => void;
}

/** Nível 3: a execução com as seções do processo (old: pjExecucaoHTML). */
const TelaExecucao = ({ execucao: e, secao, podeAlterar, podeRenovarDocumentos, aoTrocarSecao, aoAtualizar, aoIrPara }: Props) => {
  const { notificar, confirmar } = useInteracao();
  const celular = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [empresaDaCotacao, setEmpresaDaCotacao] = useState<number | null>(null);
  const [renovando, setRenovando] = useState<Documento | null>(null);
  const alterar = podeAlterar && !e.recursoArquivado;
  const fechar = () => setDialogo(null);
  const salvo = (mensagem: string) => (nova: ExecucaoDetalhe) => {
    aoAtualizar(nova);
    notificar(mensagem);
  };

  /** Executa uma ação da API (com confirmação opcional) e troca o detalhe pelo que voltou. */
  const executar = async (acao: () => Promise<ExecucaoDetalhe>, mensagem: string, pergunta?: string) => {
    if (pergunta && !(await confirmar(pergunta, { rotuloConfirmar: 'Confirmar', perigo: pergunta.startsWith('Excluir') || pergunta.startsWith('Remover') }))) return;
    try {
      salvo(mensagem)(await acao());
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    }
  };

  const acoes: AcoesExecucao = {
    ir: aoTrocarSecao,
    plano: () => setDialogo('plano'),
    vincularEmpresa: () => setDialogo('empresa'),
    removerEmpresa: (vinculoId, nome) =>
      executar(() => servicoProjetos.desvincularEmpresa(e.id, vinculoId), 'Empresa removida desta execução.', `Remover "${nome}" desta execução? O cadastro da empresa continua no sistema para outros projetos.`),
    novaCotacao: (empresaId) => {
      setEmpresaDaCotacao(empresaId);
      setDialogo('cotacao');
    },
    escolherVencedora: (id) => executar(() => servicoProjetos.escolherVencedora(e.id, id), 'Cotação vencedora selecionada.'),
    excluirCotacao: (id, descricao) => executar(() => servicoProjetos.excluirCotacao(e.id, id), 'Excluída.', `Excluir ${descricao}?`),
    novaOrdem: () => setDialogo('ordem'),
    excluirOrdem: (id, numero) => executar(() => servicoProjetos.excluirOrdem(e.id, id), 'Excluída.', `Excluir a ordem ${numero}?`),
    renovarDocumentoApae: async (id) => {
      try {
        setRenovando(await servicoDocumentos.detalhe(id));
      } catch (x) {
        notificar(mensagemDeErro(x), 'error');
      }
    },
    novoDocumento: () => setDialogo('documento'),
    excluirDocumento: (id, nome) => executar(() => servicoProjetos.excluirDocumento(e.id, id), 'Excluído.', `Excluir o documento "${nome}"?`),
    novoPagamento: () => setDialogo('pagamento'),
    excluirPagamento: (id, descricao) =>
      executar(() => servicoProjetos.excluirPagamento(e.id, id), 'Excluído.', `Excluir ${descricao}? O valor volta para o saldo da execução.`),
    novaPendencia: () => setDialogo('pendencia'),
    concluirPendencia: (id, concluida) => executar(() => servicoProjetos.concluirPendencia(e.id, id, concluida), concluida ? 'Pendência resolvida.' : 'Pendência reaberta.'),
    excluirPendencia: (id) => executar(() => servicoProjetos.excluirPendencia(e.id, id), 'Pendência excluída.', 'Excluir esta pendência?'),
  };

  const excluir = async () => {
    if (!(await confirmar(`Excluir a execução "${e.nome}"? O valor planejado volta a ficar livre no recurso.`, { rotuloConfirmar: 'Excluir', perigo: true }))) return;
    try {
      await servicoProjetos.excluirExecucao(e.id);
      notificar('Execução excluída.');
      aoIrPara({ recurso: e.recursoId });
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    }
  };

  // Marca de cada seção: ✓ quando todas as etapas dela estão feitas; número da etapa quando não.
  const etapasDa = (s: SecaoExecucao) => e.situacao.etapas.filter((x) => x.secao === s);
  const abertas = e.pendencias.filter((p) => !p.concluida).length;
  const marca = (s: (typeof SECOES)[number], n: number) => {
    if (!s.etapa) return s.chave === 'pendencias' && abertas ? <Chip size="small" label={abertas} color="warning" /> : null;
    const ok = etapasDa(s.chave).every((x) => x.ok);
    return (
      <Box width={22} height={22} borderRadius="50%" display="grid" sx={{ placeItems: 'center', fontSize: 12, bgcolor: ok ? 'success.main' : 'grey.200', color: ok ? 'white' : 'text.secondary' }} aria-label={ok ? 'Concluída' : 'Pendente'}>
        {ok ? '✓' : n}
      </Box>
    );
  };
  const Conteudo = CONTEUDO[secao];

  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component="button" underline="hover" onClick={() => aoIrPara(null)}>
          Projetos
        </Link>
        <Link component="button" underline="hover" onClick={() => aoIrPara({ recurso: e.recursoId })}>
          {e.recursoNome}
        </Link>
        <Typography color="textPrimary">{e.nome}</Typography>
      </Breadcrumbs>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} mb={2}>
        <Box minWidth={0}>
          <Typography variant="caption" color="textSecondary">
            {e.codigo} · Execução
          </Typography>
          <Typography variant="h4" sx={{ overflowWrap: 'anywhere' }}>
            {e.nome}
          </Typography>
          <Typography color="textSecondary">
            {formatarData(e.dataInicio)} → {formatarData(e.dataFim)}
            {e.responsavel ? ` · ${e.responsavel}` : ''}
          </Typography>
        </Box>
        <Box>
          <ChipStatus status={e.status} />
        </Box>
      </Stack>
      {alterar ? (
        <Stack direction="row" spacing={1} mb={3}>
          <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={() => setDialogo('editar')}>
            Editar
          </Button>
          <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={excluir}>
            Excluir
          </Button>
        </Stack>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          {celular ? (
            <Tabs value={secao} onChange={(_, v) => aoTrocarSecao(v)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider' }}>
              {SECOES.map((s) => (
                <Tab key={s.chave} value={s.chave} label={s.rotulo} />
              ))}
            </Tabs>
          ) : (
            <BlankCard>
              <List component="nav" aria-label="Seções da execução" dense>
                {SECOES.map((s, i) => (
                  <ListItemButton key={s.chave} selected={secao === s.chave} onClick={() => aoTrocarSecao(s.chave)} aria-current={secao === s.chave ? 'page' : undefined}>
                    <ListItemIcon sx={{ minWidth: 34 }}>{marca(s, i)}</ListItemIcon>
                    <ListItemText
                      primary={s.rotulo}
                      secondary={etapasDa(s.chave).length > 1 ? etapasDa(s.chave).map((x) => `${x.ok ? '✓' : '○'} ${x.rotulo}`).join(' · ') : undefined}
                    />
                  </ListItemButton>
                ))}
              </List>
              <Typography variant="caption" color="textSecondary" px={2} pb={1.5} display="block">
                Processo: {e.situacao.etapasFeitas}/{e.situacao.etapas.length} etapas
              </Typography>
            </BlankCard>
          )}
        </Grid>
        <Grid item xs={12} md={9}>
          <BlankCard>
            <Box p={{ xs: 2, md: 3 }}>
              <Conteudo execucao={e} podeAlterar={alterar} podeRenovarDocumentos={podeRenovarDocumentos} acoes={acoes} />
              {secao === 'resumo' ? <Relacionados tipo="EXECUCAO" id={e.id} /> : null}
              {secao === 'resumo' ? <HistoricoDoRegistro carregar={() => servicoProjetos.historicoExecucao(e.id)} versao={e.atualizadoEm + e.situacao.etapasFeitas} /> : null}
            </Box>
          </BlankCard>
        </Grid>
      </Grid>

      <FormularioExecucao aberto={dialogo === 'editar'} execucao={e} aoFechar={fechar} aoSalvar={salvo('Alterações salvas.')} />
      <DialogoPlano execucao={dialogo === 'plano' ? e : null} aoFechar={fechar} aoSalvar={salvo('Plano salvo.')} />
      <DialogoVincularEmpresa execucao={dialogo === 'empresa' ? e : null} aoFechar={fechar} aoSalvar={salvo('Empresa ligada à execução.')} />
      <DialogoCotacao execucao={dialogo === 'cotacao' ? e : null} empresaId={empresaDaCotacao} aoFechar={fechar} aoSalvar={salvo('Cotação salva.')} />
      <DialogoOrdem execucao={dialogo === 'ordem' ? e : null} aoFechar={fechar} aoSalvar={salvo('Ordem de compra salva.')} />
      <DialogoDocumentoExecucao execucao={dialogo === 'documento' ? e : null} aoFechar={fechar} aoSalvar={salvo('Documento anexado.')} />
      <DialogoPagamento execucao={dialogo === 'pagamento' ? e : null} aoFechar={fechar} aoSalvar={salvo('Pagamento registrado.')} />
      <DialogoPendencia execucao={dialogo === 'pendencia' ? e : null} aoFechar={fechar} aoSalvar={salvo('Pendência registrada.')} />
      <DialogoRenovarDocumento
        documento={renovando}
        aoFechar={() => setRenovando(null)}
        aoRenovar={async () => {
          notificar('Documento renovado.');
          aoAtualizar(await servicoProjetos.execucao(e.id));
        }}
      />
    </>
  );
};

export default TelaExecucao;

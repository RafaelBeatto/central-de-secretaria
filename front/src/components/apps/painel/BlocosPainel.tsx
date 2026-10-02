import { ReactNode } from 'react';
import { ButtonBase, CardContent, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BlankCard from 'src/components/shared/BlankCard';
import type { DadosPainel } from 'src/types/painel';
import type { RecursoResumo } from 'src/types/projetos';
import { resumo as resumoAtendimentos } from 'src/utils/atendimentos';
import { diaSemanaCurto, diasAte, hojeIso, somarDias } from 'src/utils/datas';
import { situacaoValidade } from 'src/utils/documentos';
import { formatarData } from 'src/utils/formatacao';
import { formatarMoeda } from 'src/utils/projetos';

const Bloco = ({ titulo, link, aoAbrir, children }: { titulo: string; link?: string; aoAbrir?: () => void; children: ReactNode }) => (
  <BlankCard>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="h6">{titulo}</Typography>
        {link ? (
          <ButtonBase onClick={aoAbrir} sx={{ color: 'primary.main', typography: 'body2' }}>
            {link}
          </ButtonBase>
        ) : null}
      </Stack>
      {children}
    </CardContent>
  </BlankCard>
);

const Medidor = ({ pct }: { pct: number }) => (
  <LinearProgress variant="determinate" value={Math.min(100, pct)} sx={{ height: 8, borderRadius: 4, my: 0.5 }} />
);

/** "Hoje" e "Próximos 7 dias": agenda + atendimentos do dia (documentos ficam em Pendências). */
export function HojeEProximos({ dados }: { dados: DadosPainel }) {
  const navegar = useNavigate();
  const hoje = hojeIso();
  const itens = dados.agenda.filter((i) => i.origem !== 'DOCUMENTO');
  const deHoje = itens
    .filter((i) => i.data === hoje)
    .sort((a, b) => (a.horarioInicio ?? '99').localeCompare(b.horarioInicio ?? '99'));
  const proximos = itens.filter((i) => i.data > hoje && !i.concluido);
  const atendimentosHoje = dados.atendimentosSemana.filter((a) => a.data === hoje);
  const r = atendimentosHoje.length ? resumoAtendimentos(atendimentosHoje) : null;
  const pct = r?.total ? Math.round(((r.veio + r.faltou) / r.total) * 100) : 0;
  const diaCurto = (iso: string) => (diasAte(iso) === 1 ? 'amanhã' : `${diaSemanaCurto(iso)}, ${formatarData(iso).slice(0, 5)}`);
  const linha = (chave: string, quando: string, titulo: string, detalhe: string, feito = false) => (
    <ButtonBase key={chave} onClick={() => navegar('/agenda')} sx={{ display: 'flex', width: '100%', justifyContent: 'flex-start', gap: 1.5, py: 0.75, textAlign: 'left' }}>
      <Typography variant="body2" color="textSecondary" sx={{ minWidth: 64 }}>
        {quando}
      </Typography>
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ textDecoration: feito ? 'line-through' : 'none' }}>
          {titulo}
        </Typography>
        {detalhe ? (
          <Typography variant="caption" color="textSecondary">
            {detalhe}
          </Typography>
        ) : null}
      </Stack>
    </ButtonBase>
  );

  return (
    <Stack spacing={3}>
      <Bloco titulo="Hoje" link="Agenda →" aoAbrir={() => navegar('/agenda')}>
        {r ? (
          <ButtonBase onClick={() => navegar('/atendimentos')} sx={{ display: 'block', width: '100%', textAlign: 'left', mb: 1 }}>
            <Typography variant="subtitle2">Atendimentos de hoje: {r.total}</Typography>
            <Typography variant="caption" color="textSecondary">
              {r.veio} vieram · {r.faltou} faltaram{r.semRegistro ? ` · ${r.semRegistro} sem registro` : ''}
            </Typography>
            <Medidor pct={pct} />
          </ButtonBase>
        ) : null}
        {deHoje.length || r ? (
          deHoje.map((i) => linha(i.chave, i.horarioInicio?.slice(0, 5) ?? '—', i.titulo, [i.local, i.responsavel].filter(Boolean).join(' · '), i.concluido))
        ) : (
          <Typography color="textSecondary">Nada marcado para hoje.</Typography>
        )}
      </Bloco>
      <Bloco titulo="Próximos 7 dias">
        {proximos.length ? (
          <>
            {proximos.slice(0, 7).map((i) => linha(i.chave, diaCurto(i.data), i.titulo, [i.horarioInicio?.slice(0, 5), i.local].filter(Boolean).join(' · ')))}
            {proximos.length > 7 ? (
              <ButtonBase onClick={() => navegar('/agenda')} sx={{ color: 'primary.main', typography: 'body2', mt: 1 }}>
                + {proximos.length - 7} na Agenda →
              </ButtonBase>
            ) : null}
          </>
        ) : (
          <Typography color="textSecondary">Nada nos próximos 7 dias.</Typography>
        )}
      </Bloco>
    </Stack>
  );
}

/** Recursos em andamento com o quanto já foi pago (old: dbProjetosHTML). */
export function Projetos({ recursos }: { recursos: RecursoResumo[] }) {
  const navegar = useNavigate();
  const ativos = recursos.filter((r) => !r.arquivado && r.status !== 'ENCERRADO');
  if (!ativos.length) return null;
  return (
    <Bloco titulo="Projetos em andamento" link="Ver projetos →" aoAbrir={() => navegar('/projetos')}>
      <Grid container spacing={2}>
        {ativos.map((r) => {
          const f = r.financeiro;
          const pct = f.recebido > 0 ? Math.min(100, Math.round((f.pago / f.recebido) * 100)) : 0;
          const fim = r.execucoes.map((e) => e.dataFim).sort().pop();
          return (
            <Grid item xs={12} md={6} key={r.id}>
              <ButtonBase onClick={() => navegar(`/projetos?recurso=${r.id}`)} sx={{ display: 'block', width: '100%', textAlign: 'left', p: 1, borderRadius: 1 }}>
                <Typography variant="subtitle2">{r.nome}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {r.execucoes.length} {r.execucoes.length === 1 ? 'execução' : 'execuções'}
                  {fim ? ` · termina em ${formatarData(fim)}` : ''}
                </Typography>
                <Medidor pct={pct} />
                <Typography variant="caption" color="textSecondary">
                  {formatarMoeda(f.pago)} de {formatarMoeda(f.recebido)} · {pct}%
                </Typography>
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>
    </Bloco>
  );
}

/** Três números da semana que nenhuma outra tela resume. */
export function Numeros({ dados }: { dados: DadosPainel }) {
  const navegar = useNavigate();
  const limite = somarDias(hojeIso(), -7);
  const feitas = dados.tarefas.filter((t) => t.status === 'CONCLUIDA' && t.dataConclusao && t.dataConclusao >= limite).length;
  const comValidade = dados.documentos.filter((d) => d.dataValidade);
  const emDia = comValidade.filter((d) => situacaoValidade(d.dataValidade) !== 'vencido').length;
  const venceu = comValidade.length - emDia;
  const semana = resumoAtendimentos(dados.atendimentosSemana);

  const numero = (valor: string, rotulo: string, detalhe: string, rota: string) => (
    <Grid item xs={12} sm={4}>
      <ButtonBase onClick={() => navegar(rota)} sx={{ display: 'block', width: '100%', textAlign: 'left', p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <Typography variant="h3">{valor}</Typography>
        <Typography variant="subtitle2">{rotulo}</Typography>
        <Typography variant="caption" color="textSecondary">
          {detalhe}
        </Typography>
      </ButtonBase>
    </Grid>
  );

  return (
    <Grid container spacing={2} aria-label="Como estamos">
      {numero(String(feitas), 'tarefas concluídas', 'nos últimos 7 dias', '/secretaria')}
      {numero(
        comValidade.length ? `${emDia}/${comValidade.length}` : '—',
        'documentos em dia',
        comValidade.length ? (venceu ? `${venceu} ${venceu === 1 ? 'vencido' : 'vencidos'}` : 'todos válidos') : 'nenhum com validade',
        '/documentos',
      )}
      {numero(
        semana.taxa === null ? '—' : `${semana.taxa}%`,
        'presença nos atendimentos',
        semana.taxa === null ? 'nenhuma presença marcada nesta semana' : 'nesta semana',
        '/atendimentos',
      )}
    </Grid>
  );
}

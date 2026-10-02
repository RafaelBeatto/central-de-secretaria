import { useState } from 'react';
import { Box, Button, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import DialogoJustificarFalta from 'src/components/apps/atendimentos/DialogoJustificarFalta';
import DialogoRenovarDocumento from 'src/components/apps/documentos/DialogoRenovarDocumento';
import { PERMISSOES } from 'src/constantes/permissoes';
import { usePermissao } from 'src/hooks/usePermissao';
import { servicoAgenda } from 'src/servicos/agenda';
import { servicoAtendimentos } from 'src/servicos/atendimentos';
import { servicoProjetos } from 'src/servicos/projetos';
import { servicoTarefas } from 'src/servicos/tarefas';
import type { AtendimentoResposta, MotivoFalta } from 'src/types/atendimentos';
import type { Documento } from 'src/types/documentos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData } from 'src/utils/formatacao';
import { CategoriaPendencia, Pendencia, porCategoria, SECOES_PENDENCIA } from 'src/utils/pendencias';

const TOM: Record<CategoriaPendencia, 'error' | 'primary' | 'warning' | 'info'> = {
  atrasado: 'error',
  hoje: 'primary',
  atencao: 'warning',
  proximo: 'info',
};

interface Props {
  pendencias: Pendencia[];
  categorias?: CategoriaPendencia[];
  /** Linhas por seção; o resto vira "+N em Pendências". */
  limite?: number;
  /** Acima disso os atendimentos sem presença viram uma linha só que leva à tela deles. */
  maxAtendimentos?: number;
  /** Mostra a frase de ajuda de cada seção (tela de Pendências). */
  comDicas?: boolean;
  aoMudar: () => void;
}

/**
 * As seções de pendências (Atrasado / Para hoje / Precisa de atenção / Próximos dias) com a ação
 * ali mesmo, usadas pela tela de Pendências e pelo "Para resolver" do Painel (old: pendMontarLinhas).
 */
const SecoesPendencias = ({ pendencias, categorias, limite, maxAtendimentos = 8, comDicas, aoMudar }: Props) => {
  const navegar = useNavigate();
  const { notificar } = useInteracao();
  const { podeAlterar } = usePermissao();
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [faltou, setFaltou] = useState<AtendimentoResposta | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const grupos = porCategoria(pendencias);

  /** Atendimentos em excesso viram uma linha de resumo (como o antigo). */
  const linhasDaSecao = (categoria: CategoriaPendencia): Pendencia[] => {
    const todas = grupos[categoria];
    const atendimentos = todas.filter((p) => p.acao?.tipo === 'atendimento');
    if (atendimentos.length <= maxAtendimentos) return todas;
    const resumo: Pendencia = {
      id: `atendimentos-${categoria}`,
      categoria,
      origem: 'atendimentos',
      rotulo: 'Atendimentos',
      titulo: `${atendimentos.length} atendimentos sem presença marcada`,
      descricao: categoria === 'hoje' ? 'De hoje' : `O mais antigo é de ${formatarData(atendimentos[0].data)}`,
      data: atendimentos[0].data,
      abrir: '/atendimentos',
      acao: null,
    };
    return [...todas.filter((p) => p.acao?.tipo !== 'atendimento'), resumo];
  };

  const executar = async (chave: string, acao: () => Promise<unknown>, mensagem: string) => {
    setOcupado(chave);
    try {
      await acao();
      notificar(mensagem);
      aoMudar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    } finally {
      setOcupado(null);
    }
  };

  const registrarFalta = async (motivo: MotivoFalta, observacao: string) => {
    if (!faltou) return;
    await servicoAtendimentos.atualizarPresenca(faltou.id, { presenca: 'FALTOU', faltaMotivo: motivo, faltaObservacao: observacao });
    setFaltou(null);
    notificar('Falta registrada.');
    aoMudar();
  };

  const abrirFalta = async (id: number) => {
    try {
      setFaltou(await servicoAtendimentos.detalhe(id));
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const botoes = (p: Pendencia) => {
    const a = p.acao;
    if (!a) return null;
    const botao = (rotulo: string, aoClicar: () => void, tom: 'primary' | 'inherit' = 'primary') => (
      <Button key={rotulo} size="small" variant="outlined" color={tom} disabled={ocupado === p.id} onClick={aoClicar}>
        {rotulo}
      </Button>
    );
    switch (a.tipo) {
      case 'tarefa':
        return podeAlterar(PERMISSOES.TAREFA_ESCREVER)
          ? botao('✓ Concluir', () => executar(p.id, () => servicoTarefas.concluir(a.tarefa.id), 'Tarefa concluída.'))
          : null;
      case 'documento':
        return podeAlterar(PERMISSOES.DOCUMENTO_ESCREVER) ? botao('Renovar', () => setDocumento(a.documento)) : null;
      case 'atendimento':
        return podeAlterar(PERMISSOES.ATENDIMENTO_ESCREVER) ? (
          <>
            {botao('✓ Veio', () =>
              executar(p.id, () => servicoAtendimentos.atualizarPresenca(a.id, { presenca: 'VEIO', faltaMotivo: '', faltaObservacao: '' }), 'Presença registrada.'),
            )}
            {botao('✕ Faltou', () => abrirFalta(a.id), 'inherit')}
          </>
        ) : null;
      case 'evento':
        return podeAlterar(PERMISSOES.AGENDA_ESCREVER)
          ? botao('✓ Feito', () => executar(p.id, () => servicoAgenda.concluir(a.id), 'Compromisso concluído.'))
          : null;
      case 'faltas':
        return podeAlterar(PERMISSOES.ATENDIMENTO_ESCREVER)
          ? botao('✓ Família contatada', () => executar(p.id, () => servicoAtendimentos.contatoFamilia(a.alunoId), 'Contato com a família registrado.'))
          : null;
      case 'pendenciaProjeto':
        return podeAlterar(PERMISSOES.PROJETO_ESCREVER)
          ? botao('✓ Resolvida', () => executar(p.id, () => servicoProjetos.concluirPendencia(a.execucaoId, a.id, true), 'Pendência resolvida.'))
          : null;
      default:
        return null;
    }
  };

  const linha = (p: Pendencia, categoria: CategoriaPendencia) => {
    const acoes = botoes(p);
    return (
      <Stack
        key={p.id}
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ py: 1, pl: 1.5, borderLeft: 3, borderColor: `${TOM[categoria]}.main`, '& + &': { mt: 0.5 } }}
      >
        <ButtonBase
          onClick={() => navegar(p.abrir)}
          sx={{ display: 'block', textAlign: 'left', flex: 1, minWidth: 0, borderRadius: 1 }}
          aria-label={`Abrir: ${p.titulo}`}
        >
          <Typography variant="caption" color="textSecondary" display="block">
            {p.rotulo}
          </Typography>
          <Typography variant="subtitle2" fontWeight={600}>
            {p.titulo}
          </Typography>
          {p.descricao ? (
            <Typography variant="body2" color="textSecondary">
              {p.descricao}
            </Typography>
          ) : null}
        </ButtonBase>
        {acoes ? (
          <Stack direction="row" spacing={1} flexShrink={0}>
            {acoes}
          </Stack>
        ) : null}
      </Stack>
    );
  };

  return (
    <>
      {SECOES_PENDENCIA.filter((s) => (!categorias || categorias.includes(s.categoria)) && grupos[s.categoria].length).map((s) => {
        const linhas = linhasDaSecao(s.categoria);
        const visiveis = limite ? linhas.slice(0, limite) : linhas;
        return (
          <Box key={s.categoria} mb={2.5}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Typography variant="h6" color={`${TOM[s.categoria]}.main`}>
                {s.titulo}
              </Typography>
              <Chip size="small" color={TOM[s.categoria]} label={linhas.length} />
            </Stack>
            {comDicas ? (
              <Typography variant="body2" color="textSecondary" mb={1}>
                {s.dica}
              </Typography>
            ) : null}
            {visiveis.map((p) => linha(p, s.categoria))}
            {limite && linhas.length > limite ? (
              <Button size="small" sx={{ mt: 1 }} onClick={() => navegar('/pendencias')}>
                + {linhas.length - limite} em Pendências →
              </Button>
            ) : null}
          </Box>
        );
      })}
      <DialogoRenovarDocumento
        documento={documento}
        aoFechar={() => setDocumento(null)}
        aoRenovar={() => {
          setDocumento(null);
          notificar('Documento renovado.');
          aoMudar();
        }}
      />
      <DialogoJustificarFalta atendimento={faltou} aoFechar={() => setFaltou(null)} aoConfirmar={registrarFalta} />
    </>
  );
};

export default SecoesPendencias;

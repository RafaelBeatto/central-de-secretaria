import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import TabelaResponsiva from 'src/components/compartilhados/TabelaResponsiva';
import { useConsulta } from 'src/hooks/useConsulta';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoAtendimentos } from 'src/servicos/atendimentos';
import type { AlunoAtendimento, ProfissionalAtendimento } from 'src/types/atendimentos';
import { LIMITES } from 'src/constantes/limites';
import { mensagemDeErro } from 'src/utils/erroApi';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
}

type Cadastro = AlunoAtendimento | ProfissionalAtendimento;

/** Renomear, unir duplicados e excluir alunos/profissionais sem uso (old: renderGestaoAlunosProfissionais). */
const DialogoGestaoCadastros = ({ aberto, aoFechar }: Props) => {
  const { notificar, confirmar } = useInteracao();
  const [aba, setAba] = useState<'alunos' | 'profissionais'>('alunos');
  const [mesclando, setMesclando] = useState<{ tipo: 'alunos' | 'profissionais'; origem: Cadastro } | null>(null);
  const [destinoId, setDestinoId] = useState<number | ''>('');

  const alunos = useConsulta(() => servicoAtendimentos.listarAlunos(), [aberto]);
  const profissionais = useConsulta(() => servicoAtendimentos.listarProfissionais(), [aberto]);
  const lista = aba === 'alunos' ? alunos : profissionais;

  const renomear = async (item: Cadastro, nome: string) => {
    if (!nome.trim() || nome.trim() === item.nome) return;
    try {
      if (aba === 'alunos') await servicoAtendimentos.renomearAluno(item.id, nome.trim());
      else await servicoAtendimentos.renomearProfissional(item.id, nome.trim());
      notificar('✓ Nome atualizado.');
      lista.recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const excluir = async (item: Cadastro) => {
    if (item.totalAtendimentos > 0) {
      notificar('Não é possível excluir: existem atendimentos com este nome. Mescle-o em outro antes.', 'error');
      return;
    }
    if (!(await confirmar(`Excluir "${item.nome}"? Não há nenhum atendimento com este nome.`, { rotuloConfirmar: 'Excluir' }))) return;
    try {
      if (aba === 'alunos') await servicoAtendimentos.excluirAluno(item.id);
      else await servicoAtendimentos.excluirProfissional(item.id);
      notificar('Registro excluído.');
      lista.recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const confirmarMesclar = async () => {
    if (!mesclando || !destinoId) return;
    try {
      if (mesclando.tipo === 'alunos') await servicoAtendimentos.mesclarAluno(mesclando.origem.id, destinoId);
      else await servicoAtendimentos.mesclarProfissional(mesclando.origem.id, destinoId);
      notificar('✓ Cadastros unidos.');
      setMesclando(null);
      setDestinoId('');
      lista.recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return (
    <>
      <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle sx={{ pr: 6 }}>
          Alunos e profissionais
          <IconButton aria-label="Fechar" onClick={aoFechar} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ px: 3 }}>
          <Tab value="alunos" label="Alunos" />
          <Tab value="profissionais" label="Profissionais" />
        </Tabs>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Corrija nomes digitados errado e una cadastros repetidos (ex.: “João” e “joão”). Os atendimentos acompanham.
          </Typography>
          <TabelaResponsiva<Cadastro>
            colunas={[
              {
                titulo: 'Nome',
                principal: true,
                valor: (item) => (
                  <CustomTextField
                    defaultValue={item.nome}
                    size="small"
                    inputProps={{ maxLength: LIMITES.ATENDIMENTO_NOME }}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => renomear(item, e.target.value)}
                  />
                ),
              },
              { titulo: 'Atendimentos', alinhamento: 'right', valor: (item) => item.totalAtendimentos },
            ]}
            itens={lista.dados}
            carregando={lista.carregando}
            erro={lista.erro}
            chave={(item) => item.id}
            vazio="Nenhum cadastro ainda — eles são criados ao adicionar atendimentos."
            acoes={(item) => (
              <MenuAcoes
                acoes={[
                  { rotulo: 'Unir com…', aoClicar: () => setMesclando({ tipo: aba, origem: item }) },
                  { rotulo: 'Excluir', perigo: true, aoClicar: () => excluir(item) },
                ]}
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={aoFechar}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!mesclando} onClose={() => setMesclando(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Unir com qual cadastro?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Os atendimentos de &quot;{mesclando?.origem.nome}&quot; passam para o cadastro escolhido, e este é removido.
          </Typography>
          <CustomTextField
            select
            fullWidth
            value={destinoId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDestinoId(Number(e.target.value))}
          >
            {(lista.dados ?? [])
              .filter((item) => item.id !== mesclando?.origem.id)
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
              .map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.nome}
                </MenuItem>
              ))}
          </CustomTextField>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} p={1}>
            <Button onClick={() => setMesclando(null)} color="inherit">
              Voltar
            </Button>
            <Button variant="contained" disabled={!destinoId} onClick={confirmarMesclar}>
              Unir
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DialogoGestaoCadastros;

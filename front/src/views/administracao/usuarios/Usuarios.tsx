import { useState } from 'react';
import { Box, Button, Chip, InputAdornment, Stack, TextField } from '@mui/material';
import { IconEdit, IconKey, IconPlus, IconSearch, IconUserCheck, IconUserOff } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import TabelaResponsiva, { Coluna } from 'src/components/compartilhados/TabelaResponsiva';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoUsuarios } from 'src/servicos/usuarios';
import type { UsuarioDetalhe, UsuarioResumo } from 'src/types/acesso';
import { formatarDataHora } from 'src/utils/formatacao';
import { mensagemDeErro } from 'src/utils/erroApi';
import { useSelector } from 'src/store/Store';
import FormularioUsuario from './FormularioUsuario';
import DialogoRedefinirSenha from './DialogoRedefinirSenha';

const colunas: Coluna<UsuarioResumo>[] = [
  { titulo: 'Nome', valor: (u) => u.nomeCompleto, principal: true },
  { titulo: 'Usuário', valor: (u) => u.login },
  { titulo: 'Cargo', valor: (u) => u.cargoNome },
  {
    titulo: 'Situação',
    valor: (u) => <Chip size="small" label={u.ativo ? 'Ativo' : 'Desativado'} color={u.ativo ? 'success' : 'default'} />,
  },
  { titulo: 'Último acesso', valor: (u) => formatarDataHora(u.ultimoAcessoEm) },
];

const Usuarios = () => {
  const { tem } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const meuId = useSelector((s) => s.autenticacao.usuario?.id);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState({ numero: 0, tamanho: 20 });
  const [formulario, setFormulario] = useState<{ aberto: boolean; usuario: UsuarioDetalhe | null }>({ aberto: false, usuario: null });
  const [senhaDe, setSenhaDe] = useState<UsuarioResumo | null>(null);

  const { dados, carregando, erro, recarregar } = useConsulta(
    () => servicoUsuarios.listar(busca, pagina.numero, pagina.tamanho),
    [busca, pagina],
  );
  // Criar usuário em subordinada é permitido mesmo consultando outra unidade (regra da hierarquia).
  const podeGerenciar = tem(PERMISSOES.USUARIO_ESCREVER);

  const editar = async (id: number) => {
    try {
      setFormulario({ aberto: true, usuario: await servicoUsuarios.detalhe(id) });
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const alternarSituacao = async (u: UsuarioResumo) => {
    const texto = u.ativo
      ? `Desativar ${u.nomeCompleto}? A pessoa perde o acesso na hora.`
      : `Reativar o acesso de ${u.nomeCompleto}?`;
    if (!(await confirmar(texto, { rotuloConfirmar: u.ativo ? 'Desativar' : 'Reativar', perigo: u.ativo }))) return;
    try {
      await servicoUsuarios.alterarSituacao(u.id, !u.ativo);
      notificar(u.ativo ? 'Usuário desativado.' : 'Usuário reativado.');
      recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return (
    <Pagina>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems={{ sm: 'center' }}>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar por nome ou usuário"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina((p) => ({ ...p, numero: 0 }));
          }}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
          inputProps={{ 'aria-label': 'Buscar usuário' }}
          sx={{ width: { xs: '100%', sm: 320 } }}
        />
        <Box flexGrow={1} />
        {podeGerenciar ? (
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => setFormulario({ aberto: true, usuario: null })}>
            Novo usuário
          </Button>
        ) : null}
      </Stack>

      <TabelaResponsiva
        colunas={colunas}
        itens={dados?.itens}
        chave={(u) => u.id}
        carregando={carregando}
        erro={erro}
        vazio={busca ? 'Nenhum usuário com essa busca.' : 'Nenhum usuário nesta unidade.'}
        paginacao={
          dados
            ? { pagina: dados.pagina, tamanho: dados.tamanho, total: dados.total, aoMudar: (numero, tamanho) => setPagina({ numero, tamanho }) }
            : undefined
        }
        acoes={(u) => (
          <MenuAcoes
            acoes={[
              { rotulo: 'Editar', icone: <IconEdit size={18} />, aoClicar: () => editar(u.id), oculta: !podeGerenciar || u.id === meuId },
              { rotulo: 'Redefinir senha', icone: <IconKey size={18} />, aoClicar: () => setSenhaDe(u), oculta: !podeGerenciar || u.id === meuId },
              {
                rotulo: u.ativo ? 'Desativar' : 'Reativar',
                icone: u.ativo ? <IconUserOff size={18} /> : <IconUserCheck size={18} />,
                aoClicar: () => alternarSituacao(u),
                perigo: u.ativo,
                oculta: !podeGerenciar || u.id === meuId,
              },
            ]}
          />
        )}
      />

      {podeGerenciar ? (
        <>
          <FormularioUsuario
            aberto={formulario.aberto}
            usuario={formulario.usuario}
            aoFechar={() => setFormulario({ aberto: false, usuario: null })}
            aoSalvar={() => {
              notificar(formulario.usuario ? 'Usuário atualizado.' : 'Usuário cadastrado. Informe a senha provisória a ele.');
              recarregar();
            }}
          />
          <DialogoRedefinirSenha
            usuario={senhaDe}
            aoFechar={() => setSenhaDe(null)}
            aoSalvar={() => notificar('Senha redefinida.')}
          />
        </>
      ) : null}
    </Pagina>
  );
};

export default Usuarios;

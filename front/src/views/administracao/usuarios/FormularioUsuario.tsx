import { useEffect, useState } from 'react';
import _ from 'lodash';
import { Grid } from '@mui/material';
import { useFormikContext } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoUsuarios, RequisicaoCriarUsuario } from 'src/servicos/usuarios';
import { useSelector } from 'src/store/Store';
import type { Cargo, UsuarioDetalhe } from 'src/types/acesso';
import { mascaraTelefone } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';

const esquemaBase = {
  nome: regras.obrigatorio(LIMITES.USUARIO_NOME),
  sobrenome: regras.obrigatorio(LIMITES.USUARIO_SOBRENOME),
  telefone: regras.telefone(),
  email: regras.email(),
  dataNascimento: regras.dataPassada(),
  unidadeId: Yup.number().required('Escolha a unidade'),
  cargoId: Yup.number().required('Escolha o cargo'),
};
const contatoObrigatorio = (schema: Yup.AnyObjectSchema) =>
  schema.test('contato', 'Informe o telefone ou o e-mail', function (valores) {
    return valores.telefone?.trim() || valores.email?.trim()
      ? true
      : this.createError({ path: 'telefone', message: 'Informe o telefone ou o e-mail' });
  });

const esquemaCriar = contatoObrigatorio(
  Yup.object({ ...esquemaBase, login: regras.login(), senhaProvisoria: regras.senha() }),
);
const esquemaEditar = contatoObrigatorio(Yup.object(esquemaBase));

/** Cargos que posso atribuir mudam conforme a unidade escolhida (regra da hierarquia no back). */
const CampoCargo = () => {
  const { values, setFieldValue } = useFormikContext<RequisicaoCriarUsuario>();
  const [cargos, setCargos] = useState<Cargo[]>([]);

  useEffect(() => {
    if (values.unidadeId === '') return;
    servicoUsuarios.cargosAtribuiveis(Number(values.unidadeId)).then((lista) => {
      setCargos(lista);
      if (values.cargoId !== '' && !lista.some((c) => c.id === values.cargoId)) setFieldValue('cargoId', '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.unidadeId]);

  return (
    <CampoFormik
      name="cargoId"
      rotulo="Cargo"
      obrigatorio
      opcoes={cargos.map((c) => ({ valor: c.id, rotulo: c.nome }))}
      helperText={cargos.length ? undefined : 'Nenhum cargo disponível para você nesta unidade'}
    />
  );
};

interface Props {
  aberto: boolean;
  usuario: UsuarioDetalhe | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const FormularioUsuario = ({ aberto, usuario, aoFechar, aoSalvar }: Props) => {
  const { usuario: eu, unidades } = useSelector((s) => s.autenticacao);
  const editando = !!usuario;
  const opcoesUnidade = unidades.map((u) => ({ valor: u.id, rotulo: `${'— '.repeat(u.profundidade)}${u.nome}` }));

  const valoresIniciais: RequisicaoCriarUsuario = {
    login: usuario?.login ?? '',
    senhaProvisoria: '',
    nome: usuario?.nome ?? '',
    sobrenome: usuario?.sobrenome ?? '',
    telefone: usuario?.telefone ?? '',
    email: usuario?.email ?? '',
    dataNascimento: usuario?.dataNascimento ?? '',
    unidadeId: usuario?.unidadeId ?? eu?.unidade.id ?? '',
    cargoId: usuario?.cargoId ?? '',
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={editando ? `Editar ${usuario!.nome}` : 'Novo usuário'}
      valoresIniciais={valoresIniciais}
      esquema={editando ? esquemaEditar : esquemaCriar}
      rotuloSalvar={editando ? 'Salvar alterações' : 'Cadastrar usuário'}
      largura="md"
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        if (editando) {
          await servicoUsuarios.atualizar(usuario!.id, _.omit(valores, ['login', 'senhaProvisoria']));
        } else {
          await servicoUsuarios.criar(valores);
        }
        aoSalvar();
      }}
    >
      <Grid container columnSpacing={3}>
        {editando ? null : (
          <>
            <Grid item xs={12} sm={6}>
              <CampoFormik name="login" rotulo="Usuário (login)" obrigatorio limite={LIMITES.USUARIO_LOGIN} autoComplete="off" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CampoFormik
                name="senhaProvisoria"
                rotulo="Senha provisória"
                obrigatorio
                type="password"
                autoComplete="new-password"
                limite={LIMITES.SENHA_MAXIMO}
                helperText="A pessoa troca no primeiro acesso"
              />
            </Grid>
          </>
        )}
        <Grid item xs={12} sm={6}>
          <CampoFormik name="nome" rotulo="Nome" obrigatorio limite={LIMITES.USUARIO_NOME} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="sobrenome" rotulo="Sobrenome" obrigatorio limite={LIMITES.USUARIO_SOBRENOME} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="telefone" rotulo="Telefone" limite={LIMITES.TELEFONE} mascara={mascaraTelefone} inputMode="tel" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="email" rotulo="E-mail" type="email" limite={LIMITES.EMAIL} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="dataNascimento" rotulo="Data de nascimento" obrigatorio type="date" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="unidadeId"
            rotulo="Unidade"
            obrigatorio
            opcoes={opcoesUnidade}
            helperText={
              unidades.length < 2
                ? 'Para cadastrar em outra APAE, crie antes a unidade em Administração → Unidades.'
                : undefined
            }
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoCargo />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioUsuario;

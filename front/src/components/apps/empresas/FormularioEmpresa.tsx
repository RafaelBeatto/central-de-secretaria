import { useState } from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useFormikContext } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { LIMITES } from 'src/constantes/limites';
import { DadosCnpj, servicoEmpresas } from 'src/servicos/empresas';
import type { Empresa, EmpresaCriada, RequisicaoEmpresa } from 'src/types/empresas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { mascaraCnpj, mascaraCpf, mascaraTelefone } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  razaoSocial: regras.obrigatorio(LIMITES.EMPRESA_RAZAO_SOCIAL),
  nomeFantasia: regras.texto(LIMITES.EMPRESA_NOME_FANTASIA),
  cnpj: regras.cnpj(),
  telefone: regras.telefone(),
  email: regras.email(),
  endereco: regras.texto(LIMITES.EMPRESA_ENDERECO),
  municipio: regras.texto(LIMITES.MUNICIPIO),
  uf: regras.uf(),
  representante: regras.texto(LIMITES.RESPONSAVEL),
  cpfRepresentante: regras.cpf(),
  observacao: regras.texto(LIMITES.EMPRESA_OBSERVACAO),
});

/** Tamanho de cada campo que a consulta preenche (o texto da Receita pode passar da coluna). */
const LIMITE_CAMPO: Record<keyof DadosCnpj, number> = {
  razaoSocial: LIMITES.EMPRESA_RAZAO_SOCIAL,
  nomeFantasia: LIMITES.EMPRESA_NOME_FANTASIA,
  endereco: LIMITES.EMPRESA_ENDERECO,
  municipio: LIMITES.MUNICIPIO,
  uf: LIMITES.UF,
  telefone: LIMITES.TELEFONE,
  email: LIMITES.EMAIL,
};

/** "Buscar dados": consulta o CNPJ e preenche só os campos vazios — nunca apaga o que foi digitado. */
const BotaoBuscarCnpj = () => {
  const { values, setFieldValue } = useFormikContext<RequisicaoEmpresa>();
  const { notificar } = useInteracao();
  const [consultando, setConsultando] = useState(false);

  const buscar = async () => {
    if (!values.cnpj.trim()) {
      notificar('Digite o CNPJ primeiro.', 'warning');
      return;
    }
    setConsultando(true);
    try {
      const dados = await servicoEmpresas.consultarCnpj(values.cnpj);
      const vazios = (Object.keys(LIMITE_CAMPO) as (keyof DadosCnpj)[]).filter((campo) => dados[campo] && !values[campo].trim());
      vazios.forEach((campo) => setFieldValue(campo, (dados[campo] as string).slice(0, LIMITE_CAMPO[campo])));
      notificar(
        vazios.length
          ? `✓ ${vazios.length} campo(s) preenchido(s) com os dados da Receita.`
          : 'Os campos já estavam preenchidos — nada foi alterado.',
        vazios.length ? 'success' : 'info',
      );
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <Button variant="outlined" startIcon={<IconSearch size={16} />} onClick={buscar} disabled={consultando} sx={{ mt: { sm: 3.5 }, height: 40, whiteSpace: 'nowrap' }}>
      {consultando ? 'Consultando…' : 'Buscar dados'}
    </Button>
  );
};

interface Props {
  aberto: boolean;
  empresa: Empresa | null;
  aoFechar: () => void;
  aoSalvar: (resultado: EmpresaCriada) => void;
}

/** Cadastro único da empresa, usado também por Projetos e Gerador (old: abrirFormEmpresaGlobal). */
const FormularioEmpresa = ({ aberto, empresa: e, aoFechar, aoSalvar }: Props) => {
  const valoresIniciais: RequisicaoEmpresa = {
    razaoSocial: e?.razaoSocial ?? '',
    nomeFantasia: e?.nomeFantasia ?? '',
    cnpj: e?.cnpj ?? '',
    telefone: e?.telefone ?? '',
    email: e?.email ?? '',
    endereco: e?.endereco ?? '',
    municipio: e?.municipio ?? '',
    uf: e?.uf ?? '',
    representante: e?.representante ?? '',
    cpfRepresentante: e?.cpfRepresentante ?? '',
    observacao: e?.observacao ?? '',
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={e ? `Editar ${e.razaoSocial}` : 'Nova empresa'}
      valoresIniciais={valoresIniciais}
      esquema={esquema}
      largura="md"
      rotuloSalvar={e ? 'Salvar' : 'Cadastrar empresa'}
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        aoSalvar(e ? { empresa: await servicoEmpresas.atualizar(e.id, valores), jaExistia: false } : await servicoEmpresas.criar(valores));
      }}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik name="razaoSocial" rotulo="Razão social" obrigatorio limite={LIMITES.EMPRESA_RAZAO_SOCIAL} autoFocus />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="nomeFantasia" rotulo="Nome fantasia" limite={LIMITES.EMPRESA_NOME_FANTASIA} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box display="flex" gap={1} alignItems="flex-start" flexDirection={{ xs: 'column', sm: 'row' }}>
            <Box flexGrow={1} width="100%">
              <CampoFormik name="cnpj" rotulo="CNPJ" mascara={mascaraCnpj} placeholder="00.000.000/0000-00" inputProps={{ inputMode: 'numeric' }} />
            </Box>
            <BotaoBuscarCnpj />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="telefone" rotulo="Telefone / contato" mascara={mascaraTelefone} inputProps={{ inputMode: 'tel' }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="email" rotulo="E-mail" type="email" limite={LIMITES.EMAIL} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="endereco" rotulo="Endereço" limite={LIMITES.EMPRESA_ENDERECO} />
        </Grid>
        <Grid item xs={8} sm={9}>
          <CampoFormik name="municipio" rotulo="Município" limite={LIMITES.MUNICIPIO} />
        </Grid>
        <Grid item xs={4} sm={3}>
          <CampoFormik name="uf" rotulo="UF" mascara={(v) => v.toUpperCase()} limite={LIMITES.UF} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="representante" rotulo="Representante" limite={LIMITES.RESPONSAVEL} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="cpfRepresentante" rotulo="CPF do representante" mascara={mascaraCpf} placeholder="000.000.000-00" inputProps={{ inputMode: 'numeric' }} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="observacao" rotulo="Observação" multiline minRows={2} limite={LIMITES.EMPRESA_OBSERVACAO} />
        </Grid>
      </Grid>
      <Typography variant="body2" color="textSecondary" mt={2}>
        {e
          ? 'As mudanças valem em todos os projetos e documentos ligados a esta empresa.'
          : 'A empresa fica cadastrada uma vez só e pode ser ligada a projetos depois.'}
      </Typography>
    </DialogoFormulario>
  );
};

export default FormularioEmpresa;

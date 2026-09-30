import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, FormControlLabel, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { Form, Formik, useField } from 'formik';
import { IconUpload } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import DashboardCard from 'src/components/shared/DashboardCard';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CustomCheckbox from 'src/components/forms/theme-elements/CustomCheckbox';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { LIMITES } from 'src/constantes/limites';
import { servicoUnidades, RequisicaoDadosInstitucionais } from 'src/servicos/unidades';
import { ACEITA, servicoArquivos } from 'src/servicos/arquivos';
import { ErroApi, mensagemDeErro } from 'src/utils/erroApi';
import { mascaraCnpj, mascaraCpf, mascaraTelefone } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  nome: regras.obrigatorio(LIMITES.UNIDADE_NOME),
  cnpj: regras.cnpj(),
  endereco: regras.texto(LIMITES.UNIDADE_ENDERECO),
  telefone: regras.telefone(),
  email: regras.email(),
  cidadeUf: regras.texto(LIMITES.UNIDADE_CIDADE_UF),
  site: regras.texto(LIMITES.UNIDADE_SITE),
  presidente: regras.texto(LIMITES.NOME_PESSOA),
  cpfPresidente: regras.cpf(),
  rodapeTexto: regras.texto(LIMITES.UNIDADE_RODAPE),
});

const OPCOES_RODAPE = [
  ['rodapeEndereco', 'Endereço'],
  ['rodapeTelefone', 'Telefone'],
  ['rodapeEmail', 'E-mail'],
  ['rodapeSite', 'Site'],
] as const;

const Marcador = ({ name, rotulo, desabilitado }: { name: string; rotulo: string; desabilitado: boolean }) => {
  const [campo, , ajudante] = useField<boolean>(name);
  return (
    <FormControlLabel
      disabled={desabilitado}
      control={<CustomCheckbox checked={!!campo.value} onChange={(_: unknown, v: boolean) => ajudante.setValue(v)} />}
      label={rotulo}
    />
  );
};

/** Logo: o arquivo vai para a AWS S3 e o formulário guarda só o id. */
const CampoLogo = ({ desabilitado }: { desabilitado: boolean }) => {
  const [campo, , ajudante] = useField<number | null>('logoArquivoId');
  const [url, setUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { notificar } = useInteracao();

  useEffect(() => {
    if (campo.value) servicoArquivos.url(campo.value).then(setUrl).catch(() => setUrl(null));
    else setUrl(null);
  }, [campo.value]);

  const enviar = async (arquivo?: File) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      ajudante.setValue((await servicoArquivos.enviar(arquivo, 'LOGO')).id);
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" mt={3}>
      <Avatar variant="rounded" src={url ?? undefined} sx={{ width: 72, height: 72, bgcolor: 'grey.100' }}>
        Logo
      </Avatar>
      <Box>
        <Button component="label" variant="outlined" startIcon={<IconUpload size={18} />} disabled={desabilitado || enviando}>
          {enviando ? 'Enviando…' : campo.value ? 'Trocar logo' : 'Enviar logo'}
          <input hidden type="file" accept={ACEITA.imagem} onChange={(e) => enviar(e.target.files?.[0])} />
        </Button>
        <Typography variant="caption" display="block" color="textSecondary" mt={0.5}>
          PNG, JPG ou WEBP, até {LIMITES.ARQUIVO_TAMANHO_MB} MB. Vale depois de salvar.
        </Typography>
      </Box>
    </Stack>
  );
};

/** Cabeçalho e rodapé de todos os documentos e PDFs da unidade (antiga "Dados da instituição"). */
const DadosInstituicao = () => {
  const { podeAlterar } = usePermissao();
  const { notificar } = useInteracao();
  const { dados: unidade, carregando, erro, definirDados } = useConsulta(servicoUnidades.atual);
  const somenteLeitura = !podeAlterar(PERMISSOES.INSTITUICAO_ESCREVER);

  if (erro) return <Pagina><Alert severity="error">{erro}</Alert></Pagina>;
  if (carregando || !unidade) return <Pagina><LinearProgress /></Pagina>;

  const valoresIniciais: RequisicaoDadosInstitucionais = {
    nome: unidade.nome,
    cnpj: unidade.cnpj ?? '',
    endereco: unidade.endereco ?? '',
    telefone: unidade.telefone ?? '',
    email: unidade.email ?? '',
    cidadeUf: unidade.cidadeUf ?? '',
    site: unidade.site ?? '',
    presidente: unidade.presidente ?? '',
    cpfPresidente: unidade.cpfPresidente ?? '',
    rodapeTexto: unidade.rodapeTexto ?? '',
    rodapeEndereco: unidade.rodapeEndereco,
    rodapeTelefone: unidade.rodapeTelefone,
    rodapeEmail: unidade.rodapeEmail,
    rodapeSite: unidade.rodapeSite,
    rodapeMostrarPagina: unidade.rodapeMostrarPagina,
    logoArquivoId: unidade.logoArquivoId,
  };

  return (
    <Pagina>
      <Formik
        initialValues={valoresIniciais}
        validationSchema={esquema}
        enableReinitialize
        onSubmit={async (valores, { setErrors, setStatus }) => {
          setStatus(undefined);
          try {
            definirDados(await servicoUnidades.salvarDadosInstitucionais(esquema.cast(valores) as RequisicaoDadosInstitucionais));
            notificar('Dados da instituição salvos.');
          } catch (e) {
            const falha = ErroApi.de(e);
            setErrors(falha.campos);
            setStatus(falha.message);
          }
        }}
      >
        {({ isSubmitting, status, dirty }) => (
          <Form noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={7}>
                <DashboardCard title="Instituição" subtitle="Vai no cabeçalho de todos os documentos">
                  <>
                    {status ? <Alert severity="error">{status}</Alert> : null}
                    <CampoLogo desabilitado={somenteLeitura} />
                    <Grid container columnSpacing={3}>
                      <Grid item xs={12}>
                        <CampoFormik name="nome" rotulo="Nome da instituição" obrigatorio limite={LIMITES.UNIDADE_NOME} disabled={somenteLeitura} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <CampoFormik name="cnpj" rotulo="CNPJ" mascara={mascaraCnpj} limite={LIMITES.CNPJ} disabled={somenteLeitura} inputMode="numeric" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <CampoFormik name="telefone" rotulo="Telefone" mascara={mascaraTelefone} limite={LIMITES.TELEFONE} disabled={somenteLeitura} inputMode="tel" />
                      </Grid>
                      <Grid item xs={12}>
                        <CampoFormik name="endereco" rotulo="Endereço" limite={LIMITES.UNIDADE_ENDERECO} disabled={somenteLeitura} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <CampoFormik name="cidadeUf" rotulo="Cidade/UF" limite={LIMITES.UNIDADE_CIDADE_UF} placeholder="Corumbiara/RO" disabled={somenteLeitura} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <CampoFormik name="email" rotulo="E-mail" type="email" limite={LIMITES.EMAIL} disabled={somenteLeitura} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <CampoFormik name="site" rotulo="Site" limite={LIMITES.UNIDADE_SITE} disabled={somenteLeitura} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <CampoFormik name="presidente" rotulo="Presidente / representante legal" limite={LIMITES.NOME_PESSOA} disabled={somenteLeitura} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <CampoFormik name="cpfPresidente" rotulo="CPF do presidente" mascara={mascaraCpf} limite={LIMITES.CPF} disabled={somenteLeitura} inputMode="numeric" />
                      </Grid>
                    </Grid>
                  </>
                </DashboardCard>
              </Grid>
              <Grid item xs={12} lg={5}>
                <DashboardCard title="Rodapé dos documentos" subtitle="O que aparece no fim de cada página">
                  <>
                    <Stack mt={1}>
                      {OPCOES_RODAPE.map(([nome, rotulo]) => (
                        <Marcador key={nome} name={nome} rotulo={`Incluir ${rotulo}`} desabilitado={somenteLeitura} />
                      ))}
                      <Marcador name="rodapeMostrarPagina" rotulo='Mostrar "Página X de Y" no PDF' desabilitado={somenteLeitura} />
                    </Stack>
                    <CampoFormik
                      name="rodapeTexto"
                      rotulo="Outras informações (texto livre)"
                      multiline
                      minRows={3}
                      limite={LIMITES.UNIDADE_RODAPE}
                      placeholder="Ex.: Utilidade Pública Municipal – Lei nº 000/0000"
                      disabled={somenteLeitura}
                    />
                  </>
                </DashboardCard>
              </Grid>
            </Grid>
            {somenteLeitura ? null : (
              <Box display="flex" justifyContent="flex-end" mt={3}>
                <Button type="submit" variant="contained" size="large" disabled={isSubmitting || !dirty} fullWidth={false}>
                  {isSubmitting ? 'Salvando…' : 'Salvar dados da instituição'}
                </Button>
              </Box>
            )}
          </Form>
        )}
      </Formik>
    </Pagina>
  );
};

export default DadosInstituicao;

import { Alert, Box, FormHelperText, Typography } from '@mui/material';
import { useField } from 'formik';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CampoFormik from 'src/components/formularios/CampoFormik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import EditorRico from 'src/components/formularios/EditorRico';
import { LIMITES } from 'src/constantes/limites';
import { servicoGerador } from 'src/servicos/gerador';
import type { ModeloDocumento, RequisicaoModelo } from 'src/types/gerador';
import { escapeHtml } from 'src/utils/documentoA4';
import { classificarChaves, extrairManuais, rotuloCampo } from 'src/utils/gerador';
import { regras, Yup } from 'src/utils/validacao';

const temConteudo = (html: string) => /<table|<img/i.test(html) || html.replace(/<[^>]*>|&nbsp;/g, '').trim().length > 0;

const esquema = Yup.object({
  nome: regras.obrigatorio(LIMITES.GERADOR_MODELO_NOME),
  titulo: regras.texto(LIMITES.GERADOR_TITULO),
  serie: regras.texto(LIMITES.GERADOR_SERIE),
  texto: Yup.string()
    .max(LIMITES.GERADOR_TEXTO, 'O texto é grande demais')
    .test('conteudo', 'Escreva o texto do documento', (v) => !!v && temConteudo(v)),
});

/** Campo "Texto padrão": o editor rico ligado ao Formik, com a lista dos campos detectados embaixo. */
const CampoTexto = ({ valorInicial, espacamentoInicial }: { valorInicial: string; espacamentoInicial: string }) => {
  const [campo, meta, ajudante] = useField<string>('texto');
  const [, , ajudanteEspaco] = useField<string>('espacamento');
  const texto = campo.value ?? '';
  const chaves = classificarChaves(texto);
  const manuais = extrairManuais(texto);
  const partes = [
    chaves.automaticos.length && `Automáticos: ${chaves.automaticos.map((c) => `{${c}}`).join(', ')}`,
    chaves.contexto.length && `De contexto: ${chaves.contexto.map((c) => `{${c}}`).join(', ')}`,
    manuais.length && `Manuais: ${manuais.map((c) => `[${c}]`).join(', ')}`,
  ].filter(Boolean);

  return (
    <>
      <CustomFormLabel>Texto padrão *</CustomFormLabel>
      <EditorRico
        valorInicial={valorInicial}
        espacamentoInicial={espacamentoInicial}
        aoMudar={({ html, espacamento }) => {
          ajudante.setValue(html);
          ajudanteEspaco.setValue(espacamento);
        }}
      />
      {meta.touched && meta.error ? <FormHelperText error>{meta.error}</FormHelperText> : null}
      <Alert severity="info" icon={false} sx={{ mt: 1.5 }}>
        <Typography variant="body2" component="div">
          <b>{'{CAMPO}'}</b> = o sistema preenche. Disponíveis: {'{NOME_APAE}'}, {'{CNPJ_APAE}'}, {'{ENDERECO_APAE}'}, {'{TELEFONE_APAE}'}, {'{EMAIL_APAE}'}, {'{CIDADE_UF}'}, {'{PRESIDENTE}'}, {'{CPF_PRESIDENTE}'}, {'{DATA}'}, {'{DATA_CURTA}'}, {'{ANO}'}, {'{NUMERO}'}.
        </Typography>
        <Typography variant="body2" component="div">
          <b>[CAMPO]</b> = você preenche na hora de gerar. Ex.: [NOME], [CPF], [ASSUNTO]. Usar <b>{'{NUMERO}'}</b> liga a numeração automática por ano.
        </Typography>
      </Alert>
      <Box mt={1} color="text.secondary" fontSize={13}>
        {partes.length ? partes.join(' · ') : 'Nenhum campo detectado ainda.'}
        {chaves.contexto.length ? ` (os de contexto aparecem como: ${chaves.contexto.map(rotuloCampo).join(', ')})` : ''}
      </Box>
    </>
  );
};

interface Props {
  aberto: boolean;
  /** Modelo a editar; nulo cria um novo. */
  modelo: ModeloDocumento | null;
  aoFechar: () => void;
  aoSalvar: (m: ModeloDocumento, novo: boolean) => void;
}

/** Criar/editar modelo (old: abrirModalModeloGerador). Modelos do sistema não passam por aqui: são duplicados antes. */
const FormularioModelo = ({ aberto, modelo, aoFechar, aoSalvar }: Props) => {
  const valorInicial = !modelo ? '' : modelo.formato === 'HTML' ? modelo.texto : escapeHtml(modelo.texto).replace(/\n/g, '<br>');
  const valoresIniciais: RequisicaoModelo = {
    nome: modelo?.nome ?? '',
    titulo: modelo?.titulo ?? '',
    serie: modelo?.serie ?? '',
    texto: valorInicial,
    espacamento: modelo?.espacamento ?? '1.5',
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={modelo ? `Editar modelo: ${modelo.nome}` : 'Criar novo modelo'}
      valoresIniciais={valoresIniciais}
      esquema={esquema}
      largura="md"
      rotuloSalvar={modelo ? 'Salvar alterações' : 'Salvar modelo'}
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        const salvo = modelo ? await servicoGerador.atualizarModelo(modelo.id, valores) : await servicoGerador.criarModelo(valores);
        aoSalvar(salvo, !modelo);
      }}
    >
      <CampoFormik name="nome" rotulo="Nome do modelo" obrigatorio limite={LIMITES.GERADOR_MODELO_NOME} placeholder="Ex.: Declaração de comparecimento" />
      <CampoFormik name="titulo" rotulo="Título do documento" limite={LIMITES.GERADOR_TITULO} placeholder="Ex.: DECLARAÇÃO DE COMPARECIMENTO" />
      <CampoFormik
        name="serie"
        rotulo="Série para numeração automática (opcional)"
        limite={LIMITES.GERADOR_SERIE}
        helperText="Deixe vazio para usar o nome do modelo. Só numera se o texto usar {NUMERO}."
      />
      <CampoTexto valorInicial={valorInicial} espacamentoInicial={valoresIniciais.espacamento} />
    </DialogoFormulario>
  );
};

export default FormularioModelo;

import { Grid } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CampoArquivoFormik from 'src/components/formularios/CampoArquivoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoDocumentos } from 'src/servicos/documentos';
import {
  CategoriaDocumento,
  Documento,
  ExigenciaApae,
  RequisicaoDocumento,
  ROTULO_CATEGORIA_DOCUMENTO,
  ROTULO_EXIGENCIA_APAE,
} from 'src/types/documentos';
import { hojeIso } from 'src/utils/datas';
import { regras, Yup } from 'src/utils/validacao';
import AtalhosValidade from './AtalhosValidade';

const esquema = Yup.object({
  nome: regras.obrigatorio(LIMITES.DOCUMENTO_NOME),
  numero: regras.texto(LIMITES.DOCUMENTO_NUMERO),
  orgao: regras.texto(LIMITES.DOCUMENTO_ORGAO),
  responsavel: regras.texto(LIMITES.RESPONSAVEL),
  localGuardado: regras.texto(LIMITES.DOCUMENTO_LOCAL_GUARDADO),
  tags: regras.texto(LIMITES.DOCUMENTO_TAGS),
  descricao: regras.texto(LIMITES.TEXTO_LONGO),
  observacoes: regras.texto(LIMITES.TEXTO_LONGO),
  dataValidade: Yup.string().test(
    'depois-da-emissao',
    'A validade não pode ser antes da emissão.',
    (validade, ctx) => !validade || !ctx.parent.dataEmissao || validade >= ctx.parent.dataEmissao,
  ),
});

const OPCOES_CATEGORIA = (Object.keys(ROTULO_CATEGORIA_DOCUMENTO) as CategoriaDocumento[]).map((c) => ({
  valor: c,
  rotulo: ROTULO_CATEGORIA_DOCUMENTO[c],
}));
const OPCOES_EXIGENCIA = [
  { valor: '', rotulo: 'Não' },
  ...(Object.keys(ROTULO_EXIGENCIA_APAE) as ExigenciaApae[]).map((e) => ({ valor: e, rotulo: ROTULO_EXIGENCIA_APAE[e] })),
];

interface Props {
  aberto: boolean;
  documento: Documento | null;
  responsaveis: string[];
  aoFechar: () => void;
  aoSalvar: (d: Documento, novo: boolean) => void;
}

/** Cadastro e edição de documento (old/js/06-documentos.js: openFormDocumento). */
const FormularioDocumento = ({ aberto, documento: d, responsaveis, aoFechar, aoSalvar }: Props) => {
  const valoresIniciais: RequisicaoDocumento = {
    nome: d?.nome ?? '',
    categoria: d?.categoria ?? 'CERTIDAO',
    exigenciaApae: d?.exigenciaApae ?? '',
    numero: d?.numero ?? '',
    orgao: d?.orgao ?? '',
    responsavel: d?.responsavel ?? '',
    dataEmissao: d ? d.dataEmissao ?? '' : hojeIso(),
    dataValidade: d?.dataValidade ?? '',
    localGuardado: d?.localGuardado ?? '',
    tags: d?.tags ?? '',
    descricao: d?.descricao ?? '',
    observacoes: d?.observacoes ?? '',
    arquivoId: d?.arquivoId ?? null,
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={d ? 'Editar documento' : 'Novo documento'}
      valoresIniciais={valoresIniciais}
      esquema={esquema}
      largura="md"
      rotuloSalvar={d ? 'Salvar alterações' : 'Cadastrar documento'}
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        const salvo = d ? await servicoDocumentos.atualizar(d.id, valores) : await servicoDocumentos.criar(valores);
        aoSalvar(salvo, !d);
      }}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik
            name="nome"
            rotulo="Nome do documento"
            obrigatorio
            limite={LIMITES.DOCUMENTO_NOME}
            placeholder="Ex.: Certidão Negativa de Débitos Federais"
            autoFocus
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="categoria" rotulo="Categoria" opcoes={OPCOES_CATEGORIA} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="exigenciaApae" rotulo="Vale como documento da APAE nos projetos" opcoes={OPCOES_EXIGENCIA} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="orgao" rotulo="Órgão emissor" limite={LIMITES.DOCUMENTO_ORGAO} placeholder="Ex.: Receita Federal" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="numero" rotulo="Número / identificação" limite={LIMITES.DOCUMENTO_NUMERO} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="responsavel" rotulo="Responsável" limite={LIMITES.RESPONSAVEL} inputProps={{ list: 'sugestoes-responsavel-documento' }} />
          <datalist id="sugestoes-responsavel-documento">
            {responsaveis.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="dataEmissao" rotulo="Emissão" type="date" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="dataValidade" rotulo="Validade" type="date" helperText="Deixe vazio se não vence" />
          <AtalhosValidade campoEmissao="dataEmissao" campoValidade="dataValidade" />
        </Grid>
        <Grid item xs={12}>
          <CampoArquivoFormik
            name="arquivoId"
            rotulo="Arquivo"
            categoria="DOCUMENTO"
            dica={d?.arquivoId ? 'Envie outro só para substituir o atual.' : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="localGuardado" rotulo="Onde está guardado" limite={LIMITES.DOCUMENTO_LOCAL_GUARDADO} placeholder="Pasta, armário, link…" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="tags" rotulo="Tags" limite={LIMITES.DOCUMENTO_TAGS} placeholder="Ex.: convênio, prestação de contas" />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="descricao" rotulo="Para que serve" multiline minRows={2} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="observacoes" rotulo="Observações" multiline minRows={2} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioDocumento;

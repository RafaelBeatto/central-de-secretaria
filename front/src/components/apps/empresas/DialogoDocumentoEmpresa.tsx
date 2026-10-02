import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CampoArquivoFormik from 'src/components/formularios/CampoArquivoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoEmpresas } from 'src/servicos/empresas';
import { DOCUMENTOS_EMPRESA_SUGERIDOS, Empresa, RequisicaoEmpresaDocumento } from 'src/types/empresas';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  nome: regras.obrigatorio(LIMITES.EMPRESA_DOCUMENTO_NOME),
  observacao: regras.texto(LIMITES.EMPRESA_DOCUMENTO_OBSERVACAO),
  arquivoId: Yup.number().nullable().required('Anexe o arquivo do documento'),
});

const OPCOES = DOCUMENTOS_EMPRESA_SUGERIDOS.map((d) => ({ valor: d, rotulo: d }));

interface Props {
  empresa: Empresa | null;
  aoFechar: () => void;
  aoSalvar: (e: Empresa) => void;
}

/** Documento da ficha da empresa, com arquivo obrigatório (old: abrirFormDocumentoEmpresaGlobal). */
const DialogoDocumentoEmpresa = ({ empresa, aoFechar, aoSalvar }: Props) => {
  const valoresIniciais: RequisicaoEmpresaDocumento = { nome: DOCUMENTOS_EMPRESA_SUGERIDOS[0], dataValidade: '', observacao: '', arquivoId: null };

  return (
    <DialogoFormulario
      aberto={!!empresa}
      titulo="Adicionar documento da empresa"
      valoresIniciais={valoresIniciais}
      esquema={esquema}
      rotuloSalvar="Salvar documento"
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        if (empresa) aoSalvar(await servicoEmpresas.adicionarDocumento(empresa.id, valores));
      }}
    >
      <CampoFormik name="nome" rotulo="Documento" obrigatorio opcoes={OPCOES} />
      <CampoFormik name="dataValidade" rotulo="Validade (opcional)" type="date" />
      <CampoArquivoFormik name="arquivoId" rotulo="Arquivo" obrigatorio categoria="DOCUMENTO_EMPRESA" />
      <CampoFormik name="observacao" rotulo="Observação" multiline minRows={2} limite={LIMITES.EMPRESA_DOCUMENTO_OBSERVACAO} />
    </DialogoFormulario>
  );
};

export default DialogoDocumentoEmpresa;

import { useEffect, useState } from 'react';
import { Box, Button, FormHelperText, Link, Stack, Typography } from '@mui/material';
import { IconPaperclip, IconUpload } from '@tabler/icons-react';
import { useField } from 'formik';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { LIMITES } from 'src/constantes/limites';
import { ACEITA, CategoriaArquivo, servicoArquivos } from 'src/servicos/arquivos';
import { mensagemDeErro } from 'src/utils/erroApi';

/**
 * Campo de arquivo ligado ao Formik: envia para a AWS S3 ao escolher e guarda
 * só o id no formulário (nada de base64). Reaproveitável por qualquer módulo.
 */
interface Props {
  name: string;
  rotulo: string;
  categoria: CategoriaArquivo;
  obrigatorio?: boolean;
  /** Texto abaixo do botão (ex.: "envie outro só para substituir"). */
  dica?: string;
  /** Extensões aceitas pelo seletor (padrão: documentos em geral). */
  aceita?: string;
  /** Arquivo de categoria restrita: só o módulo dono abre, então aqui mostra o nome sem link. */
  restrito?: boolean;
}

const CampoArquivoFormik = ({ name, rotulo, categoria, obrigatorio, dica, aceita = ACEITA.documento, restrito }: Props) => {
  const [campo, meta, ajudante] = useField<number | null>(name);
  const { notificar } = useInteracao();
  const [nome, setNome] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const erro = meta.touched && meta.error ? meta.error : undefined;

  // Arquivo já ligado ao registro: mostra o nome dele.
  useEffect(() => {
    let ativo = true;
    if (campo.value && restrito) {
      // O nome vem do envio feito agora; as rotas genéricas não abrem arquivo restrito.
    } else if (campo.value) {
      servicoArquivos
        .dados(campo.value)
        .then((a) => ativo && setNome(a.nome))
        .catch(() => ativo && setNome('arquivo'));
    } else setNome(null);
    return () => {
      ativo = false;
    };
  }, [campo.value, restrito]);

  const enviar = async (arquivo?: File) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const enviado = await servicoArquivos.enviar(arquivo, categoria);
      setNome(enviado.nome);
      ajudante.setValue(enviado.id);
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    } finally {
      setEnviando(false);
      ajudante.setTouched(true, false);
    }
  };

  return (
    <Box>
      <CustomFormLabel htmlFor={name}>
        {rotulo}
        {obrigatorio ? ' *' : ''}
      </CustomFormLabel>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Button component="label" variant="outlined" startIcon={<IconUpload size={18} />} disabled={enviando} sx={{ flexShrink: 0 }}>
          {enviando ? 'Enviando…' : campo.value ? 'Trocar arquivo' : 'Escolher arquivo'}
          <input
            id={name}
            hidden
            type="file"
            accept={aceita}
            onChange={(e) => {
              enviar(e.target.files?.[0]);
              e.target.value = ''; // permite escolher o mesmo arquivo de novo
            }}
          />
        </Button>
        {campo.value && restrito ? (
          <Typography component="span" variant="body2" noWrap display="flex" alignItems="center" gap={0.5} minWidth={0}>
            <IconPaperclip size={16} style={{ flexShrink: 0 }} />
            {nome ?? 'Arquivo enviado'}
          </Typography>
        ) : campo.value ? (
          <Link component="button" type="button" variant="body2" onClick={() => servicoArquivos.abrir(campo.value as number)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, textAlign: 'left' }}>
            <IconPaperclip size={16} style={{ flexShrink: 0 }} />
            <Typography component="span" variant="body2" noWrap>
              {nome ?? 'Carregando…'}
            </Typography>
          </Link>
        ) : null}
      </Stack>
      <FormHelperText error={!!erro}>
        {erro ?? dica ?? `PDF, imagem, Word ou Excel, até ${LIMITES.ARQUIVO_TAMANHO_MB} MB.`}
      </FormHelperText>
    </Box>
  );
};

export default CampoArquivoFormik;

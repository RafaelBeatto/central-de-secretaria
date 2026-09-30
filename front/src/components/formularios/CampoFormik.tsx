import { ChangeEvent } from 'react';
import { MenuItem, TextFieldProps } from '@mui/material';
import { useField } from 'formik';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';

/**
 * Campo de formulário ligado ao Formik (reaproveitado em todas as telas).
 * - "limite" vira maxLength no input e mostra o contador de caracteres,
 *   impedindo digitar além do tamanho da coluna no banco.
 * - "mascara" formata enquanto digita (CPF, CNPJ, telefone).
 * - "opcoes" transforma o campo em seleção.
 */
type Props = Omit<TextFieldProps, 'name'> & {
  name: string;
  rotulo: string;
  limite?: number;
  mascara?: (valor: string) => string;
  opcoes?: { valor: string | number; rotulo: string }[];
  obrigatorio?: boolean;
};

const CampoFormik = ({ name, rotulo, limite, mascara, opcoes, obrigatorio, helperText, inputProps, SelectProps, ...resto }: Props) => {
  const [campo, meta, ajudante] = useField(name);
  const erro = meta.touched && meta.error ? meta.error : undefined;
  const valor = campo.value ?? '';
  const contador = limite && resto.multiline ? `${String(valor).length}/${limite}` : undefined;

  const aoMudar = (e: ChangeEvent<HTMLInputElement>) => {
    const texto = mascara ? mascara(e.target.value) : e.target.value;
    ajudante.setValue(texto);
  };

  return (
    <>
      <CustomFormLabel htmlFor={name}>
        {rotulo}
        {obrigatorio ? ' *' : ''}
      </CustomFormLabel>
      <CustomTextField
        id={name}
        {...campo}
        value={valor}
        onChange={aoMudar}
        select={!!opcoes}
        SelectProps={{ displayEmpty: opcoes?.some((o) => o.valor === ''), ...SelectProps }}
        fullWidth
        error={!!erro}
        helperText={erro ?? helperText ?? contador}
        inputProps={{ maxLength: limite, ...inputProps }}
        {...resto}
      >
        {opcoes?.map((opcao) => (
          <MenuItem key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </MenuItem>
        ))}
      </CustomTextField>
    </>
  );
};

export default CampoFormik;

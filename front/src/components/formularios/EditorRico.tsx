import { useEffect, useRef } from 'react';
import { Box, Divider, IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import {
  IconAlignCenter,
  IconAlignJustified,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconClearFormatting,
  IconItalic,
  IconList,
  IconListNumbers,
  IconSeparatorHorizontal,
  IconTable,
  IconUnderline,
} from '@tabler/icons-react';

/** Tamanhos do `fontSize` do navegador (1 a 7) em pontos, como no editor antigo. */
const TAMANHOS = [
  { v: '1', rotulo: '8 pt' },
  { v: '2', rotulo: '10 pt' },
  { v: '3', rotulo: '12 pt' },
  { v: '4', rotulo: '14 pt' },
  { v: '5', rotulo: '18 pt' },
  { v: '6', rotulo: '24 pt' },
  { v: '7', rotulo: '36 pt' },
];

const ESPACAMENTOS = [
  { v: '1.5', rotulo: 'Espaçamento 1,5' },
  { v: '1', rotulo: 'Simples' },
  { v: '1.8', rotulo: '1,8' },
  { v: '2', rotulo: 'Duplo' },
];

interface Props {
  /** HTML inicial (o editor não é controlado: troque a `key` para recarregar). */
  valorInicial: string;
  espacamentoInicial?: string | null;
  aoMudar: (dados: { html: string; texto: string; espacamento: string }) => void;
  alturaMinima?: number;
}

/**
 * Editor de texto rico simples (negrito, títulos, tamanho, alinhamento, listas, tabela, quebra de página e
 * espaçamento), igual ao do sistema antigo. O HTML é sanitizado de novo no back ao salvar o modelo.
 */
const EditorRico = ({ valorInicial, espacamentoInicial, aoMudar, alturaMinima = 260 }: Props) => {
  const editor = useRef<HTMLDivElement>(null);
  const espacamento = useRef(espacamentoInicial || '1.5');

  const emitir = () => {
    if (editor.current) aoMudar({ html: editor.current.innerHTML, texto: editor.current.innerText, espacamento: espacamento.current });
  };

  useEffect(() => {
    if (!editor.current) return;
    editor.current.innerHTML = valorInicial;
    editor.current.style.lineHeight = espacamento.current;
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* navegador sem execCommand: a barra fica sem efeito */
    }
    emitir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const comando = (nome: string, valor?: string) => {
    editor.current?.focus();
    try {
      document.execCommand(nome, false, valor);
    } catch {
      /* ignora */
    }
    emitir();
  };

  const inserirTabela = () => {
    const linhas = Math.min(20, Math.max(1, parseInt(window.prompt('Quantas linhas?', '3') ?? '', 10) || 3));
    const colunas = Math.min(10, Math.max(1, parseInt(window.prompt('Quantas colunas?', '3') ?? '', 10) || 3));
    const celula = '<td style="border:1px solid #000;padding:6px">&nbsp;</td>';
    const corpo = Array.from({ length: linhas }, () => `<tr>${celula.repeat(colunas)}</tr>`).join('');
    comando('insertHTML', `<table class="doc-tabela" style="width:100%;border-collapse:collapse;margin:10px 0">${corpo}</table><p><br></p>`);
  };

  /** Os botões não podem tirar o foco do texto, senão a seleção se perde antes do comando. */
  const botao = (rotulo: string, icone: JSX.Element, acao: () => void) => (
    <Tooltip title={rotulo}>
      <IconButton size="small" aria-label={rotulo} onMouseDown={(e) => e.preventDefault()} onClick={acao}>
        {icone}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={0.5} p={0.75} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {botao('Negrito', <IconBold size={18} />, () => comando('bold'))}
        {botao('Itálico', <IconItalic size={18} />, () => comando('italic'))}
        {botao('Sublinhado', <IconUnderline size={18} />, () => comando('underline'))}
        <TextField
          select
          size="small"
          defaultValue=""
          aria-label="Estilo do texto"
          SelectProps={{ displayEmpty: true, MenuProps: { disableAutoFocus: true } }}
          onChange={(e) => comando('formatBlock', e.target.value ? `<${e.target.value}>` : '<p>')}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">Texto normal</MenuItem>
          <MenuItem value="h1">Título 1</MenuItem>
          <MenuItem value="h2">Título 2</MenuItem>
          <MenuItem value="h3">Título 3</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          defaultValue=""
          aria-label="Tamanho da fonte"
          SelectProps={{ displayEmpty: true, MenuProps: { disableAutoFocus: true } }}
          onChange={(e) => e.target.value && comando('fontSize', e.target.value)}
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="">Tamanho</MenuItem>
          {TAMANHOS.map((t) => (
            <MenuItem key={t.v} value={t.v}>
              {t.rotulo}
            </MenuItem>
          ))}
        </TextField>
        <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
        {botao('Alinhar à esquerda', <IconAlignLeft size={18} />, () => comando('justifyLeft'))}
        {botao('Centralizar', <IconAlignCenter size={18} />, () => comando('justifyCenter'))}
        {botao('Alinhar à direita', <IconAlignRight size={18} />, () => comando('justifyRight'))}
        {botao('Justificar', <IconAlignJustified size={18} />, () => comando('justifyFull'))}
        <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
        {botao('Lista com marcadores', <IconList size={18} />, () => comando('insertUnorderedList'))}
        {botao('Lista numerada', <IconListNumbers size={18} />, () => comando('insertOrderedList'))}
        {botao('Inserir tabela', <IconTable size={18} />, inserirTabela)}
        {botao('Quebra de página', <IconSeparatorHorizontal size={18} />, () =>
          comando('insertHTML', '<div class="doc-quebra-pagina"></div><p><br></p>'),
        )}
        <TextField
          select
          size="small"
          defaultValue={espacamento.current}
          aria-label="Espaçamento entre linhas"
          onChange={(e) => {
            espacamento.current = e.target.value;
            if (editor.current) editor.current.style.lineHeight = e.target.value;
            emitir();
          }}
          sx={{ minWidth: 150 }}
        >
          {ESPACAMENTOS.map((s) => (
            <MenuItem key={s.v} value={s.v}>
              {s.rotulo}
            </MenuItem>
          ))}
        </TextField>
        {botao('Limpar formatação', <IconClearFormatting size={18} />, () => comando('removeFormat'))}
      </Stack>
      <Box
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        onInput={emitir}
        role="textbox"
        aria-multiline="true"
        aria-label="Texto do modelo"
        sx={{
          minHeight: alturaMinima,
          maxHeight: 420,
          overflowY: 'auto',
          p: 1.5,
          outline: 'none',
          textAlign: 'justify',
          '& table': { width: '100%', borderCollapse: 'collapse' },
          '& td, & th': { border: '1px solid', borderColor: 'text.primary', p: 0.75 },
          '& .doc-quebra-pagina': { borderTop: '2px dashed #999', height: 0, my: 1.5 },
          '&:focus': { boxShadow: (t) => `inset 0 0 0 1px ${t.palette.primary.main}` },
        }}
      />
    </Box>
  );
};

export default EditorRico;

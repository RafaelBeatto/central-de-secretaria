import { FormEvent, useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

/** Pesquisa rápida do cabeçalho: Enter abre a tela de Pesquisa com o termo (old: quickSearch). */
const BuscaGeral = () => {
  const navegar = useNavigate();
  const [termo, setTermo] = useState('');

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    if (!termo.trim()) return;
    navegar(`/pesquisa?termo=${encodeURIComponent(termo.trim())}`);
    setTermo('');
  };

  return (
    <form onSubmit={buscar} role="search" style={{ flex: 1, maxWidth: 360, marginLeft: 8 }}>
      <TextField
        size="small"
        fullWidth
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Pesquisar em tudo…"
        inputProps={{ 'aria-label': 'Pesquisar em todo o sistema', maxLength: 100 }}
        InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>) }}
      />
    </form>
  );
};

export default BuscaGeral;

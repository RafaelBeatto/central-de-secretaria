import { useEffect, useMemo, useState } from 'react';
import { Alert, ButtonBase, CardContent, Chip, InputAdornment, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Pagina from 'src/components/container/Pagina';
import BlankCard from 'src/components/shared/BlankCard';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoPesquisa } from 'src/servicos/pesquisa';
import { destinoDoResultado, ORDEM_TIPOS_PESQUISA, ROTULO_TIPO_PESQUISA, TipoResultado } from 'src/types/pesquisa';

/** Pesquisa geral: tarefas, agenda, documentos, projetos, empresas… com filtro por tipo (old: renderPesquisa). */
const Pesquisa = () => {
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [termo, setTermo] = useState(parametros.get('termo') ?? '');
  const [termoBuscado, setTermoBuscado] = useState(termo.trim());
  const [tipo, setTipo] = useState<TipoResultado | ''>('');

  // Vindo do cabeçalho com outro termo: acompanha a URL.
  const termoDaUrl = parametros.get('termo');
  useEffect(() => {
    if (termoDaUrl !== null) {
      setTermo(termoDaUrl);
      setTermoBuscado(termoDaUrl.trim());
      setTipo('');
    }
  }, [termoDaUrl]);

  // Espera um instante depois de parar de digitar.
  useEffect(() => {
    const espera = setTimeout(() => setTermoBuscado(termo.trim()), 300);
    return () => clearTimeout(espera);
  }, [termo]);

  const { dados, carregando, erro } = useConsulta(
    () => (termoBuscado.length >= 2 ? servicoPesquisa.pesquisar(termoBuscado) : Promise.resolve([])),
    [termoBuscado],
  );

  const resultados = useMemo(() => dados ?? [], [dados]);
  const contagem = useMemo(() => {
    const c: Partial<Record<TipoResultado, number>> = {};
    resultados.forEach((r) => (c[r.tipo] = (c[r.tipo] ?? 0) + 1));
    return c;
  }, [resultados]);
  const blocos = ORDEM_TIPOS_PESQUISA.filter((t) => contagem[t] && (!tipo || tipo === t));

  return (
    <Pagina>
      <TextField
        fullWidth
        autoFocus
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value);
          setParametros({}, { replace: true });
        }}
        placeholder="Digite um nome, número, CNPJ, assunto…"
        inputProps={{ 'aria-label': 'Pesquisar', maxLength: 100 }}
        InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
        sx={{ mb: 2 }}
      />
      {erro ? <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert> : null}
      {carregando ? <LinearProgress sx={{ mb: 2 }} /> : null}

      {termoBuscado.length < 2 ? (
        <Alert severity="info">Digite ao menos 2 letras. A busca procura em tarefas, agenda, documentos, documentos gerados, projetos, empresas e atendimentos, sem diferenciar acento nem maiúscula.</Alert>
      ) : dados && !resultados.length ? (
        <Alert severity="info">Nada encontrado para “{termoBuscado}”.</Alert>
      ) : null}

      {resultados.length ? (
        <>
          <Typography color="textSecondary" mb={1}>
            {resultados.length} resultado{resultados.length === 1 ? '' : 's'} para “{termoBuscado}”
          </Typography>
          {Object.keys(contagem).length > 1 ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
              <Chip label={`Tudo ${resultados.length}`} color={tipo === '' ? 'primary' : 'default'} onClick={() => setTipo('')} />
              {ORDEM_TIPOS_PESQUISA.filter((t) => contagem[t]).map((t) => (
                <Chip key={t} label={`${ROTULO_TIPO_PESQUISA[t]} ${contagem[t]}`} color={tipo === t ? 'primary' : 'default'} onClick={() => setTipo(t)} />
              ))}
            </Stack>
          ) : null}
          {blocos.map((t) => (
            <BlankCard key={t} sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Typography variant="h6">{ROTULO_TIPO_PESQUISA[t]}</Typography>
                  <Chip size="small" label={contagem[t]} />
                </Stack>
                {resultados.filter((r) => r.tipo === t).map((r) => (
                  <ButtonBase
                    key={`${r.tipo}-${r.id}`}
                    onClick={() => navegar(destinoDoResultado(r))}
                    sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', py: 1, borderTop: 1, borderColor: 'divider' }}
                  >
                    <span>
                      <Typography variant="subtitle2" component="span" display="block">{r.titulo || '—'}</Typography>
                      {r.detalhes.length ? <Typography variant="caption" color="textSecondary">{r.detalhes.join(' · ')}</Typography> : null}
                    </span>
                    <IconArrowRight size={16} aria-hidden />
                  </ButtonBase>
                ))}
              </CardContent>
            </BlankCard>
          ))}
        </>
      ) : null}
    </Pagina>
  );
};

export default Pesquisa;

import { ReactNode } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Theme,
  Typography,
  useMediaQuery,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';

/**
 * Lista padrão das telas: tabela no computador e cartões empilhados no celular,
 * com carregamento, erro, lista vazia e paginação em um lugar só.
 */
export interface Coluna<T> {
  titulo: string;
  valor: (item: T) => ReactNode;
  /** A coluna principal vira o título do cartão no celular. */
  principal?: boolean;
  alinhamento?: 'left' | 'right' | 'center';
}

interface Props<T> {
  colunas: Coluna<T>[];
  itens: T[] | undefined;
  chave: (item: T) => string | number;
  acoes?: (item: T) => ReactNode;
  carregando?: boolean;
  erro?: string | null;
  vazio?: string;
  paginacao?: { pagina: number; tamanho: number; total: number; aoMudar: (pagina: number, tamanho: number) => void };
}

function TabelaResponsiva<T>({ colunas, itens, chave, acoes, carregando, erro, vazio = 'Nada encontrado.', paginacao }: Props<T>) {
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const principal = colunas.find((c) => c.principal) ?? colunas[0];
  const lista = itens ?? [];

  const rodape = paginacao ? (
    <TablePagination
      component="div"
      count={paginacao.total}
      page={paginacao.pagina}
      rowsPerPage={paginacao.tamanho}
      rowsPerPageOptions={[10, 20, 50]}
      onPageChange={(_, pagina) => paginacao.aoMudar(pagina, paginacao.tamanho)}
      onRowsPerPageChange={(e) => paginacao.aoMudar(0, Number(e.target.value))}
    />
  ) : null;

  const estado = erro ? (
    <Alert severity="error">{erro}</Alert>
  ) : !carregando && !lista.length ? (
    <Typography color="textSecondary" p={3} textAlign="center">
      {vazio}
    </Typography>
  ) : null;

  if (celular) {
    return (
      <Box>
        {carregando ? <LinearProgress sx={{ mb: 2 }} /> : null}
        {estado}
        <Stack spacing={2}>
          {lista.map((item) => (
            <Card key={chave(item)} variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Box flexGrow={1} minWidth={0}>
                    <Typography variant="h6" component="div">
                      {principal.valor(item)}
                    </Typography>
                    {colunas
                      .filter((c) => c !== principal)
                      .map((c) => (
                        <Typography key={c.titulo} variant="body2" color="textSecondary" component="div">
                          <strong>{c.titulo}:</strong> {c.valor(item)}
                        </Typography>
                      ))}
                  </Box>
                  {acoes ? acoes(item) : null}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
        {rodape}
      </Box>
    );
  }

  return (
    <BlankCard>
      <>
      {carregando ? <LinearProgress /> : null}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {colunas.map((c) => (
                <TableCell key={c.titulo} align={c.alinhamento}>
                  <Typography variant="h6">{c.titulo}</Typography>
                </TableCell>
              ))}
              {acoes ? <TableCell align="right" /> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((item) => (
              <TableRow key={chave(item)} hover>
                {colunas.map((c) => (
                  <TableCell key={c.titulo} align={c.alinhamento}>
                    {c.valor(item)}
                  </TableCell>
                ))}
                {acoes ? <TableCell align="right">{acoes(item)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {estado ? <Box p={2}>{estado}</Box> : null}
      {rodape}
      </>
    </BlankCard>
  );
}

export default TabelaResponsiva;

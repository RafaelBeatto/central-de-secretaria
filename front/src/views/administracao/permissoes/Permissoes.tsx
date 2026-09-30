import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import Pagina from 'src/components/container/Pagina';
import DashboardCard from 'src/components/shared/DashboardCard';
import CustomCheckbox from 'src/components/forms/theme-elements/CustomCheckbox';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { ROTULO_MODULO } from 'src/constantes/permissoes';
import { servicoPermissoes } from 'src/servicos/permissoes';
import type { MatrizPermissoes } from 'src/types/acesso';
import { mensagemDeErro } from 'src/utils/erroApi';

/**
 * Matriz de permissões da unidade: escolhe o cargo e marca o que ele pode.
 * Itens em destaque diferem da matriz padrão do sistema.
 */
const Permissoes = () => {
  const { notificar, confirmar } = useInteracao();
  const { dados: matriz, carregando, erro, definirDados } = useConsulta(servicoPermissoes.matriz);
  const [cargoId, setCargoId] = useState<number | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);

  const linha = matriz?.cargos.find((l) => l.cargo.id === cargoId) ?? matriz?.cargos[0];

  useEffect(() => {
    if (linha) {
      setCargoId(linha.cargo.id);
      setMarcadas(new Set(linha.permissoes));
    }
  }, [linha]);

  const porModulo = useMemo(() => {
    const grupos = new Map<string, MatrizPermissoes['permissoes']>();
    matriz?.permissoes.forEach((p) => grupos.set(p.modulo, [...(grupos.get(p.modulo) ?? []), p]));
    return [...grupos.entries()];
  }, [matriz]);

  const alterado = !!linha && (linha.permissoes.length !== marcadas.size || linha.permissoes.some((p) => !marcadas.has(p)));

  const alternar = (codigo: string) =>
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(codigo)) nova.delete(codigo);
      else nova.add(codigo);
      // Quem escreve precisa ler: marcar "ESCREVER" marca o "LER" do módulo.
      if (codigo.endsWith('_ESCREVER') && nova.has(codigo)) {
        const leitura = codigo.replace('_ESCREVER', '_LER');
        if (matriz?.permissoes.some((p) => p.codigo === leitura)) nova.add(leitura);
      }
      return nova;
    });

  const executar = async (acao: () => Promise<MatrizPermissoes>, sucesso: string) => {
    setSalvando(true);
    try {
      definirDados(await acao());
      notificar(sucesso);
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    } finally {
      setSalvando(false);
    }
  };

  if (erro) {
    return (
      <Pagina>
        <Alert severity="error">{erro}</Alert>
      </Pagina>
    );
  }

  return (
    <Pagina>
      {carregando && !matriz ? <LinearProgress /> : null}
      {matriz && linha ? (
        <DashboardCard>
          <>
            <Tabs value={linha.cargo.id} onChange={(_, id) => setCargoId(id)} variant="scrollable" allowScrollButtonsMobile>
              {matriz.cargos.map((l) => (
                <Tab
                  key={l.cargo.id}
                  value={l.cargo.id}
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{l.cargo.nome}</span>
                      {l.ajustadas.length ? <Chip size="small" color="warning" label="ajustado" /> : null}
                    </Stack>
                  }
                />
              ))}
            </Tabs>
            <Divider />
            {!linha.editavel ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Somente consulta: você só ajusta cargos abaixo do seu, na sua própria unidade.
              </Alert>
            ) : null}
            <Grid container spacing={3} mt={0}>
              {porModulo.map(([modulo, permissoes]) => (
                <Grid item xs={12} sm={6} lg={4} key={modulo}>
                  <Typography variant="h6" mb={1}>
                    {ROTULO_MODULO[modulo] ?? modulo}
                  </Typography>
                  {permissoes.map((p) => (
                    <Box key={p.codigo}>
                      <FormControlLabel
                        disabled={!linha.editavel || salvando}
                        control={<CustomCheckbox checked={marcadas.has(p.codigo)} onChange={() => alternar(p.codigo)} />}
                        label={
                          <Typography variant="body2" color={linha.ajustadas.includes(p.codigo) ? 'warning.main' : undefined}>
                            {p.descricao}
                          </Typography>
                        }
                      />
                    </Box>
                  ))}
                </Grid>
              ))}
            </Grid>
            {linha.editavel ? (
              <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} mt={3} justifyContent="flex-end">
                <Button
                  color="inherit"
                  disabled={salvando || !linha.ajustadas.length}
                  onClick={async () => {
                    if (await confirmar(`Voltar as permissões de ${linha.cargo.nome} ao padrão do sistema?`, { rotuloConfirmar: 'Restaurar' })) {
                      executar(() => servicoPermissoes.restaurarPadrao(linha.cargo.id), 'Permissões restauradas.');
                    }
                  }}
                >
                  Restaurar padrão
                </Button>
                <Button
                  variant="contained"
                  disabled={salvando || !alterado}
                  onClick={() => executar(() => servicoPermissoes.atualizar(linha.cargo.id, [...marcadas]), 'Permissões salvas.')}
                >
                  {salvando ? 'Salvando…' : `Salvar permissões de ${linha.cargo.nome}`}
                </Button>
              </Stack>
            ) : null}
          </>
        </DashboardCard>
      ) : null}
    </Pagina>
  );
};

export default Permissoes;

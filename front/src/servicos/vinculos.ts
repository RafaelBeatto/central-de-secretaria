import api from 'src/utils/axios';
import type { TipoRegistro, Vinculado } from 'src/types/vinculos';

const dados = <T>(r: { data: T }) => r.data;

export const servicoVinculos = {
  doRegistro: (tipo: TipoRegistro, id: number) => api.get<Vinculado[]>('/vinculos', { params: { tipo, id } }).then(dados),
  opcoes: (tipo: TipoRegistro, id: number, alvo: TipoRegistro) =>
    api.get<Vinculado[]>('/vinculos/opcoes', { params: { tipo, id, alvo } }).then(dados),
  adicionar: (tipo: TipoRegistro, id: number, alvoTipo: TipoRegistro, alvoId: number) =>
    api.post<Vinculado[]>('/vinculos', { tipo, id, alvoTipo, alvoId }).then(dados),
  remover: (tipo: TipoRegistro, id: number, alvoTipo: TipoRegistro, alvoId: number) =>
    api.delete<Vinculado[]>('/vinculos', { params: { tipo, id, alvoTipo, alvoId } }).then(dados),
};

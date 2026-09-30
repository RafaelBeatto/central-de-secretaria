import * as Yup from 'yup';
import { LIMITES } from 'src/constantes/limites';

/**
 * Regras de validação reaproveitadas por todos os formulários.
 * Os limites vêm de LIMITES (espelho das colunas do banco), então o front
 * recusa exatamente o que o back recusaria.
 */
Yup.setLocale({
  mixed: { required: 'Campo obrigatório', notType: 'Valor inválido' },
  string: {
    max: ({ max }) => `Máximo de ${max} caracteres`,
    min: ({ min }) => `Mínimo de ${min} caracteres`,
    email: 'E-mail inválido',
  },
});

const somenteDigitos = (valor?: string | null) => (valor ?? '').replace(/\D/g, '');

export function cnpjValido(valor?: string | null) {
  const d = somenteDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (n: number) => {
    let soma = 0;
    let peso = n - 7;
    for (let i = 0; i < n; i++) {
      soma += Number(d[i]) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

export function cpfValido(valor?: string | null) {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export const regras = {
  /** Texto opcional com limite de tamanho. */
  texto: (limite: number) => Yup.string().trim().max(limite),
  /** Texto obrigatório com limite de tamanho. */
  obrigatorio: (limite: number) => Yup.string().trim().max(limite).required(),
  email: () => Yup.string().trim().email().max(LIMITES.EMAIL),
  telefone: () => Yup.string().trim().max(LIMITES.TELEFONE),
  cnpj: () =>
    Yup.string()
      .trim()
      .max(LIMITES.CNPJ)
      .test('cnpj', 'CNPJ inválido', (v) => !v || cnpjValido(v)),
  cpf: () =>
    Yup.string()
      .trim()
      .max(LIMITES.CPF)
      .test('cpf', 'CPF inválido', (v) => !v || cpfValido(v)),
  uf: () =>
    Yup.string()
      .trim()
      .matches(/^([A-Za-z]{2})?$/, 'Use a sigla com 2 letras'),
  /** Mesma regra do back (@SenhaForte): 8 a 72 caracteres, com letra e número. */
  senha: () =>
    Yup.string()
      .required()
      .min(LIMITES.SENHA_MINIMO)
      .max(LIMITES.SENHA_MAXIMO)
      .matches(/[A-Za-z]/, 'Precisa ter pelo menos uma letra')
      .matches(/\d/, 'Precisa ter pelo menos um número'),
  login: () =>
    Yup.string()
      .trim()
      .required()
      .min(3)
      .max(LIMITES.USUARIO_LOGIN)
      .matches(/^[A-Za-z0-9._-]+$/, 'Use só letras, números, ponto, hífen ou sublinhado'),
  dataPassada: () =>
    Yup.string()
      .required()
      .test('passado', 'A data precisa ser anterior a hoje', (v) => !v || new Date(v) < new Date()),
};

export { Yup };

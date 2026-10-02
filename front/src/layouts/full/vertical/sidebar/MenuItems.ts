import { MODULOS, Modulo } from 'src/routes/modulos';

/**
 * Itens do menu no formato do template (subheader + itens), gerados a partir
 * dos módulos e filtrados pelas permissões do usuário.
 */
export interface MenuitemsType {
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: Modulo['icone'];
  href?: string;
  children?: MenuitemsType[];
}

export function montarMenu(temPermissao: (m: Modulo) => boolean): MenuitemsType[] {
  const itens: MenuitemsType[] = [];
  let grupoAtual = '';
  MODULOS.filter((m) => !m.oculto && temPermissao(m)).forEach((modulo) => {
    if (modulo.grupo !== grupoAtual) {
      grupoAtual = modulo.grupo;
      itens.push({ navlabel: true, subheader: modulo.grupo });
    }
    itens.push({ id: modulo.caminho, title: modulo.titulo, icon: modulo.icone, href: modulo.caminho });
  });
  return itens;
}

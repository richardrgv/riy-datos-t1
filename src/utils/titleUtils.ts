// src/utils/titleUtils.ts
import { menuStructure, MenuItem } from '../data/menuStructure';

export const findTitleByPath = (path: string): string => {
  let title = 'RIY Datos'; // Título por defecto

  const find = (items: MenuItem[]) => {
    for (const item of items) {
      if (item.path === path) {
        title = item.title;
        return;
      }
      if (item.children) {
        find(item.children);
      }
    }
  };

  find(menuStructure);
  return title;
};
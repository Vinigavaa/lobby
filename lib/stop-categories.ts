/**
 * Configuracao estatica do jogo Stop (Adedonha).
 *
 * Categorias, opcoes de tempo e de numero de rodadas ficam centralizadas aqui
 * para serem reutilizadas pelo servidor (validacao/pontuacao) e pela interface.
 * Para adicionar novas categorias, basta incluir um item em `stopCategories`.
 */
export const stopCategories = [
  { key: "nome", label: "Nome" },
  { key: "animal", label: "Animal" },
  { key: "cidade", label: "Cidade" },
  { key: "pais", label: "País" },
  { key: "profissao", label: "Profissão" },
  { key: "comida", label: "Comida" },
  { key: "filme-serie", label: "Filme ou Série" },
  { key: "marca", label: "Marca" },
  { key: "objeto", label: "Objeto" },
  { key: "esporte", label: "Esporte" },
] as const;

export type StopCategoryKey = (typeof stopCategories)[number]["key"];

export const stopCategoryKeys: string[] = stopCategories.map(
  (category) => category.key
);

const labelByKey = new Map<string, string>(
  stopCategories.map((category) => [category.key, category.label])
);

export function getStopCategoryLabel(key: string) {
  return labelByKey.get(key) ?? key;
}

export const stopDurationOptions = [30, 60, 120];
export const stopDefaultDuration = 60;

export const stopRoundOptions = [3, 5, 10];
export const stopDefaultRounds = 5;

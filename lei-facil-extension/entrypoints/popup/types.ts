export interface RespostaStructurada {
  resumo: string;
  corpo: string;
  pontos: string[];
}

export interface RespostaAPI extends RespostaStructurada {}

export type AbaTipo = 'linguagem_simples' | 'pontos_principais' | 'o_que_muda_pra_mim';

export interface EstadoAba {
  conteudo: RespostaStructurada | null;
  carregando: boolean;
  erro: string;
}

export interface EstadoAbas {
  atual: AbaTipo;
  dados: Record<AbaTipo, EstadoAba>;
}
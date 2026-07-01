import { useState } from 'react';
import type { RespostaAPI } from '../types';

const API_URL = 'http://localhost:8000/simplificar';

/**
 * Encapsula a chamada ao backend e o ciclo de vida da requisição
 * (carregando / resposta / erro).
 */
export function useSimplificar() {
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState('');
  const [erro, setErro] = useState('');

  const simplificar = async (conteudo: string) => {
    if (!conteudo.trim()) {
      setErro('Nenhum conteúdo para simplificar');
      return;
    }

    setCarregando(true);
    setErro('');
    setResposta('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: conteudo }),
      });

      if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${res.statusText}`);
      }

      const dados: RespostaAPI = await res.json();

      if (!dados.texto_simplificado) {
        throw new Error('Resposta do servidor inválida');
      }

      setResposta(dados.texto_simplificado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setCarregando(false);
    }
  };

  const limpar = () => {
    setResposta('');
    setErro('');
  };

  return { carregando, resposta, erro, simplificar, limpar };
}
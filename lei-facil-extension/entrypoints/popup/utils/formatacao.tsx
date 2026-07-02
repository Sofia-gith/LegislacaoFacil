import React from 'react';

export function formatarInlineTags(texto: string): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  let indice = 0;

  const regex = /\*\*(.+?)\*\*|__(.+?)__|`(.+?)`/g;
  let match;
  let ultimoPosicao = 0;

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoPosicao) {
      partes.push(texto.substring(ultimoPosicao, match.index));
    }

    if (match[1]) {
      partes.push(<strong key={`bold-${partes.length}`}>{match[1]}</strong>);
    } else if (match[2]) {
      partes.push(<strong key={`strong-${partes.length}`}>{match[2]}</strong>);
    } else if (match[3]) {
      partes.push(<code key={`code-${partes.length}`}>{match[3]}</code>);
    }

    ultimoPosicao = match.index + match[0].length;
  }

  if (ultimoPosicao < texto.length) {
    partes.push(texto.substring(ultimoPosicao));
  }

  return partes.length > 0 ? partes : [texto];
}

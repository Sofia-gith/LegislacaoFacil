import React from 'react';
import { formatarInlineTags } from '../utils/formatacao';

interface TextoFormatadoProps {
  conteudo: string;
}

function parseTexto(texto: string): React.ReactNode[] {
  const linhas = texto.split('\n');
  const elementos: React.ReactNode[] = [];
  let listaAtiva: string[] = [];
  let indiceP = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();

    if (!linha) {
      if (listaAtiva.length > 0) {
        elementos.push(
          <ul key={`list-${indiceP}`} className="lf-formatted-list">
            {listaAtiva.map((item, idx) => (
              <li key={idx} className="lf-formatted-list-item">
                {formatarInlineTags(item)}
              </li>
            ))}
          </ul>
        );
        listaAtiva = [];
        indiceP++;
      }
      elementos.push(<div key={`space-${indiceP}`} className="lf-paragraph-space" />);
      indiceP++;
      continue;
    }

    if (linha.startsWith('-') || linha.startsWith('•') || linha.match(/^\d+\./)) {
      const itemTexto = linha.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
      listaAtiva.push(itemTexto);
    } else {
      if (listaAtiva.length > 0) {
        elementos.push(
          <ul key={`list-${indiceP}`} className="lf-formatted-list">
            {listaAtiva.map((item, idx) => (
              <li key={idx} className="lf-formatted-list-item">
                {formatarInlineTags(item)}
              </li>
            ))}
          </ul>
        );
        listaAtiva = [];
        indiceP++;
      }

      if (linha.match(/^#+\s/)) {
        const nivel = linha.match(/^#+/)?.[0].length || 1;
        const textoH = linha.replace(/^#+\s*/, '');
        
        if (nivel === 1) {
          elementos.push(
            <h3 key={`h-${indiceP}`} className="lf-formatted-h1">
              {formatarInlineTags(textoH)}
            </h3>
          );
        } else if (nivel === 2) {
          elementos.push(
            <h4 key={`h-${indiceP}`} className="lf-formatted-h2">
              {formatarInlineTags(textoH)}
            </h4>
          );
        } else {
          elementos.push(
            <h5 key={`h-${indiceP}`} className="lf-formatted-h3">
              {formatarInlineTags(textoH)}
            </h5>
          );
        }
      } else {
        elementos.push(
          <p key={`p-${indiceP}`} className="lf-formatted-paragraph">
            {formatarInlineTags(linha)}
          </p>
        );
      }
      indiceP++;
    }
  }

  if (listaAtiva.length > 0) {
    elementos.push(
      <ul key={`list-${indiceP}`} className="lf-formatted-list">
        {listaAtiva.map((item, idx) => (
          <li key={idx} className="lf-formatted-list-item">
            {formatarInlineTags(item)}
          </li>
        ))}
      </ul>
    );
  }

  return elementos;
}

export function TextoFormatado({ conteudo }: TextoFormatadoProps) {
  const elementos = parseTexto(conteudo);

  return <div className="lf-texto-formatado">{elementos}</div>;
}

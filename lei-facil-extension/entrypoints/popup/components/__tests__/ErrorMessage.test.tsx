import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('deve renderizar componente de erro', () => {
    const { container } = render(<ErrorMessage message="Erro ao processar" />);
    expect(container.querySelector('.lf-error-box')).toBeInTheDocument();
  });

  it('deve exibir classe de erro', () => {
    const { container } = render(<ErrorMessage message="Erro" />);
    const errorDiv = container.querySelector('[class*="error"]');
    expect(errorDiv).toBeInTheDocument();
  });

  it('deve conter ícone ou SVG', () => {
    const { container } = render(<ErrorMessage message="Erro" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('deve ter classe CSS de texto de erro', () => {
    const { container } = render(<ErrorMessage message="Erro" />);
    const textElement = container.querySelector('.lf-error-text');
    expect(textElement).toBeInTheDocument();
  });

  it('deve renderizar sem quebrar com mensagem vazia', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

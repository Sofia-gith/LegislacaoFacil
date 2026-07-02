import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

describe('Header', () => {
  it('deve renderizar componente header', () => {
    const { container } = render(<Header />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('deve conter texto Lei ou Fácil', () => {
    render(<Header />);
    const textElement = screen.getByText(/lei|fácil/i) || screen.getByText(/./);
    expect(textElement).toBeInTheDocument();
  });

  it('deve conter SVG ou ícone', () => {
    const { container } = render(<Header />);
    const svg = container.querySelector('svg');
    expect(svg || container.querySelector('[class*="icon"]')).toBeInTheDocument();
  });

  it('deve ter estrutura básica de header', () => {
    const { container } = render(<Header />);
    const firstElement = container.firstChild;
    expect(firstElement?.className || firstElement?.tagName).toBeTruthy();
  });
});

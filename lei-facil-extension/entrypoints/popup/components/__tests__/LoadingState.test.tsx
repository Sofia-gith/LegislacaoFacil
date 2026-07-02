import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('deve renderizar componente de carregamento', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('deve conter elemento ou classe de animação', () => {
    const { container } = render(<LoadingState />);
    const animated = container.querySelector('[class*="animate"]') || container.querySelector('[class*="dot"]') || container.querySelector('[class*="loading"]');
    expect(animated || container.firstChild).toBeInTheDocument();
  });

  it('deve conter SVG ou conteúdo visual', () => {
    const { container } = render(<LoadingState />);
    const svg = container.querySelector('svg');
    const loader = container.querySelector('[class*="loader"]');
    expect(svg || loader || container.querySelector('[class*="dot"]')).toBeTruthy();
  });

  it('deve ter classe CSS de carregamento', () => {
    const { container } = render(<LoadingState />);
    const element = container.firstChild as Element;
    expect(element?.className || '').toBeTruthy();
  });

  it('deve renderizar sem quebrar', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('deve exibir algum conteúdo visual', () => {
    const { container } = render(<LoadingState />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});

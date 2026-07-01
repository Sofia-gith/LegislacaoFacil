import { Scale } from 'lucide-react';

export function Header() {
  return (
    <div className="lf-header">
      <div className="lf-header-icon">
        <Scale size={18} color="#1a56a0" />
      </div>
      <p className="lf-header-title">LeiaFácil</p>
    </div>
  );
}
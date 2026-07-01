import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  mensagem: string;
}

export function ErrorMessage({ mensagem }: ErrorMessageProps) {
  return (
    <div className="lf-error-box">
      <p className="lf-error-text">
        <AlertCircle size={16} className="lf-icon-inline" />
        {mensagem}
      </p>
    </div>
  );
}
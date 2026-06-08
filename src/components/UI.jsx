import {LoaderCircle, X} from 'lucide-react';

export function Button({children, variant = 'primary', className = '', ...props}) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Field({label, as = 'input', ...props}) {
  const Component = as;
  return <label className="field"><span>{label}</span><Component {...props} /></label>;
}

export function Card({children, className = ''}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function PageHeader({eyebrow, title, text, actions}) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

export function Empty({title, text}) {
  return <div className="empty"><div className="empty-mark">M</div><h3>{title}</h3><p>{text}</p></div>;
}

export function Loading() {
  return <div className="loading"><LoaderCircle size={32} /><span>Loading...</span></div>;
}

export function Modal({title, children, onClose, wide = false}) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={event => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={20} /></button></header>{children}</section></div>;
}

export function Confirm({title, text, onConfirm, onClose}) {
  return <Modal title={title} onClose={onClose}><p className="modal-copy">{text}</p><div className="modal-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm}>Delete</Button></div></Modal>;
}

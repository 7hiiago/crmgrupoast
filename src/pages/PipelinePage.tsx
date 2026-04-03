import React from 'react';
import { DB, fmt } from '@/lib/db';
import type { Negociacao } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/types';
import { PageHeader } from '@/components/UIComponents';

export default function PipelinePage({ onNewNeg, onEditNeg }: { onNewNeg: () => void; onEditNeg: (id: string) => void }) {
  const negs = DB.get<Negociacao>('negociacoes').filter(n => n.status !== 'perdida');

  return (
    <div>
      <PageHeader title="PIPE" titleEm="LINE" sub="Visão kanban das negociações ativas">
        <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded font-bold text-xs tracking-wider uppercase hover:bg-ast-red-dark transition-colors" onClick={onNewNeg}>
          + Nova Negociação
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
        {PIPELINE_STAGES.map(s => {
          const cards = negs.filter(n => n.status === s.key);
          const total = cards.reduce((sum, n) => sum + (n.valor || 0), 0);
          return (
            <div key={s.key} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-border text-[10px] font-bold tracking-[1.5px] uppercase flex items-center justify-between" style={{ color: s.color }}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="text-ast-text3">{cards.length}</span>
              </div>
              <div className="p-2.5 flex flex-col gap-2 min-h-[80px]">
                {cards.length ? cards.map(n => (
                  <div key={n.id} className="bg-ast-bg3 border border-border rounded p-2.5 cursor-pointer hover:border-ast-border2 transition-colors" onClick={() => onEditNeg(n.id)}>
                    <div className="text-[9px] text-ast-text3 tracking-wider mb-0.5">{n.codigo}</div>
                    <div className="text-xs font-semibold text-foreground mb-1">{n.titulo}</div>
                    <div className="text-[13px] text-primary font-bold">R$ {fmt(n.valor || 0)}</div>
                    <div className="text-[10px] text-ast-text3 mt-1">{n.clienteNome || '—'} · {n.prob || 0}%</div>
                  </div>
                )) : <div className="p-2 text-[11px] text-ast-text3">Sem itens</div>}
              </div>
              {total > 0 && (
                <div className="px-3 py-1.5 border-t border-border text-[10px] text-ast-text3">R$ {fmt(total)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

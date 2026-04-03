import React, { useState } from 'react';
import { DB, fmt, fmtDate, uid, nextRecCode } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { Recorrente, Empresa, Cliente, User, Anexo } from '@/lib/types';
import { PageHeader, TableCard, DataTable, Th, Td, EmptyRow, Badge, Btn } from '@/components/UIComponents';
import Modal, { FormSection, FormGrid, FormGroup, inputClass, selectClass, textareaClass } from '@/components/Modal';
import AnexoManager from '@/components/AnexoManager';
import { gerarPropostaPDF, enviarPropostaWhatsApp } from '@/lib/propostas';

export default function RecorrentesPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Recorrente>>({});
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const empresas = DB.get<Empresa>('empresas');
  const clientes = DB.get<Cliente>('clientes');
  const users = DB.get<User>('users').filter(u => u.ativo !== false);
  const recs = DB.get<Recorrente>('recorrentes');

  const openNew = () => {
    setEditingId(null);
    setForm({ codigo: nextRecCode(), data: new Date().toISOString().split('T')[0], status: 'ativo', responsavelId: user?.id });
    setAnexos([]);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const rec = recs.find(r => r.id === id);
    if (!rec) return;
    setEditingId(rec.id);
    setForm({ ...rec });
    setAnexos(rec.anexos || []);
    setModalOpen(true);
  };

  const save = () => {
    const cliId = form.clienteId;
    if (!cliId) return;
    const cli = clientes.find(c => c.id === cliId);
    const resp = users.find(u => u.id === form.responsavelId);
    const rec: Recorrente = {
      id: editingId || uid(),
      codigo: form.codigo || '',
      data: form.data || '',
      clienteId: cliId,
      clienteNome: cli?.nome || '',
      produto: form.produto || '',
      valor: form.valor || 0,
      dia: form.dia || 1,
      empresa: form.empresa || 'all',
      responsavelId: form.responsavelId || '',
      responsavelNome: resp?.nome || '',
      status: (form.status as Recorrente['status']) || 'ativo',
      obs: form.obs || '',
      anexos,
    };
    const arr = DB.get<Recorrente>('recorrentes');
    const idx = arr.findIndex(r => r.id === rec.id);
    if (idx > -1) arr[idx] = rec; else arr.push(rec);
    DB.set('recorrentes', arr);
    setModalOpen(false);
    refresh();
  };

  const deleteRec = (id: string) => {
    if (!confirm('Excluir recorrente?')) return;
    DB.set('recorrentes', DB.get<Recorrente>('recorrentes').filter(r => r.id !== id));
    refresh();
  };

  return (
    <div>
      <PageHeader title="RECOR" titleEm="RENTES" sub="Carteira de clientes e contratos ativos">
        <Btn onClick={openNew}>+ Nova Recorrente</Btn>
      </PageHeader>

      <TableCard title="Carteira de clientes">
        <DataTable>
          <thead>
            <tr><Th>Código</Th><Th>Cliente</Th><Th>Produto/Serviço</Th><Th>Valor mensal</Th><Th>Empresa</Th><Th>Data início</Th><Th>Responsável</Th><Th>Status</Th><Th></Th></tr>
          </thead>
          <tbody>
            {recs.length ? recs.map(r => (
              <tr key={r.id} className="hover:bg-ast-bg3 cursor-pointer" onClick={() => openEdit(r.id)}>
                <Td><strong className="text-foreground font-semibold">{r.codigo}</strong></Td>
                <Td>{r.clienteNome || '—'}</Td>
                <Td>{r.produto || '—'}</Td>
                <Td>R$ {fmt(r.valor || 0)}</Td>
                <Td className="hidden sm:table-cell">{r.empresa === 'all' ? 'Todas' : empresas.find(e => e.id === r.empresa)?.nome || '—'}</Td>
                <Td className="hidden md:table-cell">{fmtDate(r.data)}</Td>
                <Td className="hidden md:table-cell">{r.responsavelNome || '—'}</Td>
                <Td>
                  <Badge variant={r.status === 'ativo' ? 'green' : r.status === 'pausado' ? 'amber' : 'gray'}>
                    {r.status === 'ativo' ? 'Ativo' : r.status === 'pausado' ? 'Pausado' : 'Cancelado'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Btn variant="icon" sm onClick={() => gerarPropostaPDF(r, 'recorrente')}>📄</Btn>
                    <Btn variant="icon" sm onClick={() => enviarPropostaWhatsApp(r)}>💬</Btn>
                    <Btn variant="icon" sm onClick={() => deleteRec(r.id)}>×</Btn>
                  </div>
                </Td>
              </tr>
            )) : <EmptyRow cols={9} text="Nenhuma recorrente" />}
          </tbody>
        </DataTable>
      </TableCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Recorrente' : 'Nova Recorrente'} wide
        footer={<><Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></>}
      >
        <FormSection title="Dados da recorrência">
          <FormGrid>
            <FormGroup label="Código (auto)"><input className={inputClass} value={form.codigo || ''} readOnly /></FormGroup>
            <FormGroup label="Data início"><input type="date" className={inputClass} value={form.data || ''} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></FormGroup>
            <FormGroup label="Cliente *">
              <select className={selectClass} value={form.clienteId || ''} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                <option value="">Selecionar…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Produto/Serviço"><input className={inputClass} value={form.produto || ''} onChange={e => setForm(f => ({ ...f, produto: e.target.value }))} /></FormGroup>
            <FormGroup label="Valor mensal (R$)"><input type="number" className={inputClass} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} /></FormGroup>
            <FormGroup label="Dia vencimento"><input type="number" min={1} max={31} className={inputClass} value={form.dia || ''} onChange={e => setForm(f => ({ ...f, dia: parseInt(e.target.value) || 1 }))} /></FormGroup>
            <FormGroup label="Empresa AST">
              <select className={selectClass} value={form.empresa || 'all'} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}>
                <option value="all">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Responsável">
              <select className={selectClass} value={form.responsavelId || ''} onChange={e => setForm(f => ({ ...f, responsavelId: e.target.value }))}>
                <option value="">Selecionar…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Status">
              <select className={selectClass} value={form.status || 'ativo'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Recorrente['status'] }))}>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormGroup>
            <FormGroup label="Observações" full><textarea className={textareaClass} value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} /></FormGroup>
          </FormGrid>
        </FormSection>
        <FormSection title="Anexos">
          <AnexoManager anexos={anexos} onChange={setAnexos} />
        </FormSection>
      </Modal>
    </div>
  );
}

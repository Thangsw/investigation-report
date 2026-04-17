import { useState } from 'react';
import { X, Plus, Edit, Trash2, Check } from 'lucide-react';
import type { Investigator } from '../types';

interface Props {
  investigators: Investigator[];
  onAdd: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function InvestigatorManager({ investigators, onAdd, onUpdate, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await onAdd(name);
    setNewName('');
  };

  const startEdit = (d: Investigator) => {
    setEditingId(d.id);
    setEditingName(d.name);
  };

  const confirmEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await onUpdate(editingId, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <>
      <div className="sheet-header">
        <h2>Quản lý điều tra viên</h2>
        <button className="btn-close" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="dtv-list">
        {investigators.length === 0 && (
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Chưa có ĐTV nào.</p>
        )}
        {investigators.map(d => (
          <div key={d.id} className="dtv-item">
            {editingId === d.id ? (
              <>
                <input
                  className="form-control"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); }}
                  autoFocus
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button className="btn-small" onClick={confirmEdit}>
                  <Check size={12} />
                </button>
                <button className="btn-small" onClick={() => setEditingId(null)}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <span className="dtv-name">{d.name}</span>
                <button className="btn-small" onClick={() => startEdit(d)}>
                  <Edit size={12} />
                </button>
                <button className="btn-small btn-delete"
                  onClick={() => {
                    if (window.confirm(`Xóa ĐTV "${d.name}"?`)) onDelete(d.id);
                  }}>
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="dtv-add-row">
        <input
          className="form-control"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Thêm tên ĐTV mới..."
        />
        <button className="btn-add" onClick={handleAdd}>
          <Plus size={16} /> Thêm
        </button>
      </div>
    </>
  );
}
